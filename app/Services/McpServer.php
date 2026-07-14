<?php

namespace App\Services;

use App\Core\DataSets;
use App\Core\Reports;
use App\Core\Settings;
use Throwable;

/**
 * MCP (Model Context Protocol) server — Streamable HTTP transport.
 *
 * Lets Claude (claude.ai custom connectors, Claude Desktop, Claude Code)
 * read reports and manage data in this dashboard directly from chat.
 *
 * Endpoint:  POST https://your-site/?page=mcp&token=<mcp_token>
 * The token is generated automatically and shown in Settings.
 *
 * Implemented JSON-RPC methods: initialize, ping, tools/list, tools/call,
 * notifications/initialized (acknowledged with 202).
 */
class McpServer
{
    private const PROTOCOL = '2025-03-26';

    public static function handle(): void
    {
        header('Content-Type: application/json');

        // --- Auth: ?token= or Authorization: Bearer ---
        $token = Settings::get('mcp_token');
        $given = $_GET['token'] ?? '';
        if (!$given && preg_match('/Bearer\s+(\S+)/i', $_SERVER['HTTP_AUTHORIZATION'] ?? '', $m)) {
            $given = $m[1];
        }
        if (!$token || !hash_equals($token, (string) $given)) {
            http_response_code(401);
            echo json_encode(['jsonrpc' => '2.0', 'id' => null,
                'error' => ['code' => -32001, 'message' => 'Unauthorized: invalid MCP token']]);
            return;
        }

        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            // No server-initiated stream; clients fall back to plain POST responses.
            http_response_code(405);
            echo json_encode(['error' => 'Method Not Allowed — POST JSON-RPC messages to this URL']);
            return;
        }

        $request = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($request)) {
            echo json_encode(['jsonrpc' => '2.0', 'id' => null,
                'error' => ['code' => -32700, 'message' => 'Parse error']]);
            return;
        }

        // Notifications (no id) are acknowledged without a body.
        if (!array_key_exists('id', $request)) {
            http_response_code(202);
            return;
        }

        echo json_encode(self::dispatch($request));
    }

    private static function dispatch(array $req): array
    {
        $id = $req['id'];
        $reply = fn (array $result) => ['jsonrpc' => '2.0', 'id' => $id, 'result' => $result];

        try {
            switch ($req['method'] ?? '') {
                case 'initialize':
                    return $reply([
                        'protocolVersion' => self::PROTOCOL,
                        'capabilities'    => ['tools' => new \stdClass()],
                        'serverInfo'      => ['name' => 'analytio-marketing-reports', 'version' => '1.0.0'],
                    ]);

                case 'ping':
                    return $reply([]);

                case 'tools/list':
                    return $reply(['tools' => self::toolDefinitions()]);

                case 'tools/call':
                    $name = $req['params']['name'] ?? '';
                    $args = (array) ($req['params']['arguments'] ?? []);
                    $text = self::callTool($name, $args);
                    return $reply(['content' => [['type' => 'text', 'text' => $text]]]);

                default:
                    return ['jsonrpc' => '2.0', 'id' => $id,
                        'error' => ['code' => -32601, 'message' => 'Method not found: ' . ($req['method'] ?? '')]];
            }
        } catch (Throwable $e) {
            return $reply([
                'content' => [['type' => 'text', 'text' => 'Error: ' . $e->getMessage()]],
                'isError' => true,
            ]);
        }
    }

    private static function toolDefinitions(): array
    {
        $datasetKeys = implode(', ', array_keys(array_filter(DataSets::all(), fn ($d) => !isset($d['matrix']))));
        $metricKeys  = implode(', ', array_keys(Reports::compareMetrics()));

        return [
            [
                'name' => 'get_overview',
                'description' => 'Marketing overview: GA4 traffic, Search Console, social, email and campaign totals for the last N days with previous-period comparison.',
                'inputSchema' => ['type' => 'object', 'properties' => [
                    'days' => ['type' => 'integer', 'description' => 'Range length in days (default 30)'],
                ]],
            ],
            [
                'name' => 'get_metric_series',
                'description' => "Daily/monthly values of one metric between two dates. Metrics: {$metricKeys}",
                'inputSchema' => ['type' => 'object', 'required' => ['metric', 'from', 'to'], 'properties' => [
                    'metric' => ['type' => 'string'],
                    'from'   => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                    'to'     => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                ]],
            ],
            [
                'name' => 'list_datasets',
                'description' => 'List every editable dataset with its fields, so you know what add_row/list_rows/delete_row accept.',
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'list_rows',
                'description' => "Latest rows of a dataset (with rowids for deleting). Datasets: {$datasetKeys}",
                'inputSchema' => ['type' => 'object', 'required' => ['dataset'], 'properties' => [
                    'dataset' => ['type' => 'string'],
                    'limit'   => ['type' => 'integer', 'description' => 'Max rows (default 15, max 100)'],
                ]],
            ],
            [
                'name' => 'add_row',
                'description' => 'Add or update one row in a dataset (upserts by the dataset\'s natural key). Use list_datasets to see field names. Lookup fields (content_id, campaign_id, keyword_id) accept the natural value: content URL, campaign name, keyword text.',
                'inputSchema' => ['type' => 'object', 'required' => ['dataset', 'fields'], 'properties' => [
                    'dataset' => ['type' => 'string'],
                    'fields'  => ['type' => 'object', 'additionalProperties' => ['type' => 'string']],
                ]],
            ],
            [
                'name' => 'delete_row',
                'description' => 'Delete one row from a dataset by rowid (get rowids from list_rows). Deleting a content item, campaign, or keyword also removes its metric history.',
                'inputSchema' => ['type' => 'object', 'required' => ['dataset', 'rowid'], 'properties' => [
                    'dataset' => ['type' => 'string'],
                    'rowid'   => ['type' => 'integer'],
                ]],
            ],
            [
                'name' => 'run_sync',
                'description' => 'Run the full data sync now (content discovery, Search Console, GA4, social) and return per-source status.',
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
        ];
    }

    private static function callTool(string $name, array $args): string
    {
        switch ($name) {
            case 'get_overview':
                $days  = max(1, min(730, (int) ($args['days'] ?? 30)));
                $end   = date('Y-m-d', strtotime('-1 day'));
                $start = date('Y-m-d', strtotime("-{$days} days"));
                $prevEnd   = date('Y-m-d', strtotime("$start -1 day"));
                $prevStart = date('Y-m-d', strtotime("$prevEnd -" . ($days - 1) . ' days'));
                return json_encode([
                    'range'     => ['from' => $start, 'to' => $end],
                    'analytics' => Reports::gaTotals($start, $end),
                    'analytics_previous_period' => Reports::gaTotals($prevStart, $prevEnd),
                    'search_console' => Reports::gscTotals($start, $end),
                    'search_console_previous_period' => Reports::gscTotals($prevStart, $prevEnd),
                    'social'    => Reports::socialTotals($start, $end),
                    'email'     => Reports::emailTotals($start, $end),
                    'campaigns' => array_slice(Reports::campaignTable($start, $end), 0, 10),
                ], JSON_PRETTY_PRINT);

            case 'get_metric_series':
                $metrics = Reports::compareMetrics();
                $metric  = (string) ($args['metric'] ?? '');
                if (!isset($metrics[$metric])) {
                    return 'Unknown metric. Valid metrics: ' . implode(', ', array_keys($metrics));
                }
                return json_encode([
                    'metric' => $metrics[$metric][0],
                    'total'  => Reports::compareValue($metric, (string) $args['from'], (string) $args['to']),
                    'series' => Reports::compareSeries($metric, (string) $args['from'], (string) $args['to']),
                ], JSON_PRETTY_PRINT);

            case 'list_datasets':
                $out = [];
                foreach (DataSets::all() as $key => $def) {
                    if (isset($def['matrix'])) {
                        continue;
                    }
                    $out[$key] = [
                        'label'  => $def['label'],
                        'unique' => $def['unique'],
                        'fields' => array_map(fn ($f) => $f['type'], $def['fields']),
                    ];
                }
                return json_encode($out, JSON_PRETTY_PRINT);

            case 'list_rows':
                $rows = DataSets::recentRows((string) ($args['dataset'] ?? ''),
                                             max(1, min(100, (int) ($args['limit'] ?? 15))));
                return $rows ? json_encode($rows, JSON_PRETTY_PRINT)
                             : 'No rows found (or unknown dataset — use list_datasets).';

            case 'add_row':
                $fields = array_map(fn ($v) => is_scalar($v) ? (string) $v : json_encode($v),
                                    (array) ($args['fields'] ?? []));
                DataSets::upsertRow((string) ($args['dataset'] ?? ''), $fields);
                return 'Row saved.';

            case 'delete_row':
                DataSets::deleteRow((string) ($args['dataset'] ?? ''), (int) ($args['rowid'] ?? 0));
                return 'Row deleted (if it existed).';

            case 'run_sync':
                $lines = [];
                foreach (SyncRunner::runAll() as $source => [$status, $message]) {
                    $lines[] = sprintf('%-16s %-8s %s', $source, $status, $message);
                }
                return implode("\n", $lines);

            default:
                return 'Unknown tool: ' . $name;
        }
    }
}
