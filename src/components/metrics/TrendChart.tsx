import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendPoint {
  /** Data date-only "YYYY-MM-DD" (rótulo derivado dela). */
  date: string;
  value: number | null;
}

interface TrendChartProps {
  data: TrendPoint[];
  kind?: "line" | "area" | "bar";
  /** Série 1..5 → token --chart-N (cor segue a entidade, nunca o rank). */
  series?: 1 | 2 | 3 | 4 | 5;
  height?: number;
  /** Formata o valor no tooltip (ex.: v => `${v} bpm`). */
  valueFormatter?: (v: number) => string;
  /** Domínio fixo (ex.: [0, 100] pra scores). */
  yDomain?: [number, number];
  /**
   * Rótulo do eixo X quando a série NÃO é temporal (ex.: estágios de um
   * teste). Sem isso, `date` seria formatada como dd/MM e sairia inválida.
   */
  labelFormatter?: (key: string) => string;
}

const shortLabel = (date: string) => {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
};

/**
 * Gráfico de tendência padrão da ficha (1 eixo, tooltip, grid recessivo).
 * Marcas finas (2px), cor via tokens --chart-N; texto em tokens de texto.
 */
export const TrendChart = ({
  data,
  kind = "line",
  series = 1,
  height = 160,
  valueFormatter = (v) => String(v),
  yDomain,
  labelFormatter,
}: TrendChartProps) => {
  const xLabel = labelFormatter ?? shortLabel;
  const stroke = `hsl(var(--chart-${series}))`;
  const axisProps = {
    stroke: "hsl(var(--muted-foreground))",
    fontSize: 10,
    tickLine: false,
    axisLine: false,
  } as const;
  const grid = (
    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
  );
  const tooltip = (
    <Tooltip
      formatter={(v: number) => [valueFormatter(v), ""]}
      labelFormatter={(l: string) => xLabel(l)}
      contentStyle={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 8,
        fontSize: 12,
        color: "hsl(var(--foreground))",
      }}
    />
  );
  const xAxis = <XAxis dataKey="date" tickFormatter={xLabel} {...axisProps} minTickGap={24} />;
  const yAxis = <YAxis width={30} domain={yDomain ?? ["auto", "auto"]} {...axisProps} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === "bar" ? (
        <BarChart data={data}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          <Bar dataKey="value" fill={stroke} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      ) : kind === "area" ? (
        <AreaChart data={data}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          <Area
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={stroke}
            fillOpacity={0.12}
            connectNulls
            dot={false}
          />
        </AreaChart>
      ) : (
        <LineChart data={data}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          <Line
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            connectNulls
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
};
