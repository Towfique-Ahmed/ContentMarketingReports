import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeriesChart, type Series, type ValueFormat } from "./series-chart";

export function ChartCard({
  title,
  description,
  data,
  xKey,
  series,
  type = "line",
  height,
  format,
}: {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  type?: "line" | "area" | "bar";
  height?: number;
  format?: ValueFormat;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No data for this range yet.</p>
        ) : (
          <SeriesChart type={type} data={data} xKey={xKey} series={series} height={height} format={format} />
        )}
      </CardContent>
    </Card>
  );
}
