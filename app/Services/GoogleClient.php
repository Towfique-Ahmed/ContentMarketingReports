<?php

namespace App\Services;

use App\Core\Settings;
use RuntimeException;

/**
 * Minimal Google API client using service-account JWT (RS256) auth.
 * No SDK required — only ext-openssl and ext-curl.
 *
 * Setup: create a service account in Google Cloud, download its JSON key,
 * paste the JSON into Settings → Google Service Account. Then:
 *  - Search Console: add the service-account email as a (restricted) user
 *    of the property in Search Console.
 *  - GA4: add the service-account email as a Viewer of the GA4 property.
 */
class GoogleClient
{
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private static array $tokens = [];

    public static function configured(): bool
    {
        $json = Settings::get('google_service_account_json');
        if (!$json) {
            return false;
        }
        $creds = json_decode($json, true);
        return isset($creds['client_email'], $creds['private_key']);
    }

    public static function accessToken(string $scope): string
    {
        if (isset(self::$tokens[$scope]) && self::$tokens[$scope]['expires'] > time() + 60) {
            return self::$tokens[$scope]['token'];
        }

        $creds = json_decode((string) Settings::get('google_service_account_json'), true);
        if (!isset($creds['client_email'], $creds['private_key'])) {
            throw new RuntimeException('Google service account JSON is missing or invalid.');
        }

        $now = time();
        $header = self::b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claims = self::b64(json_encode([
            'iss'   => $creds['client_email'],
            'scope' => $scope,
            'aud'   => self::TOKEN_URL,
            'iat'   => $now,
            'exp'   => $now + 3600,
        ]));

        $signature = '';
        if (!openssl_sign("$header.$claims", $signature, $creds['private_key'], OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Failed to sign Google JWT (check the private key).');
        }
        $jwt = "$header.$claims." . self::b64($signature);

        $response = self::http('POST', self::TOKEN_URL, http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $jwt,
        ]), ['Content-Type: application/x-www-form-urlencoded']);

        if (empty($response['access_token'])) {
            throw new RuntimeException('Google token exchange failed: ' . json_encode($response));
        }

        self::$tokens[$scope] = [
            'token'   => $response['access_token'],
            'expires' => $now + (int) ($response['expires_in'] ?? 3600),
        ];
        return $response['access_token'];
    }

    public static function request(string $method, string $url, string $scope, ?array $body = null): array
    {
        $headers = ['Authorization: Bearer ' . self::accessToken($scope)];
        $payload = null;
        if ($body !== null) {
            $payload = json_encode($body);
            $headers[] = 'Content-Type: application/json';
        }
        return self::http($method, $url, $payload, $headers);
    }

    public static function http(string $method, string $url, ?string $payload, array $headers): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 60,
        ]);
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }
        $raw = curl_exec($ch);
        if ($raw === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException("HTTP request to $url failed: $err");
        }
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        $data = json_decode($raw, true) ?? [];
        if ($status >= 400) {
            $msg = $data['error']['message'] ?? substr($raw, 0, 300);
            throw new RuntimeException("HTTP $status from $url: $msg");
        }
        return $data;
    }

    private static function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
