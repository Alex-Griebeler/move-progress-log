import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface WeeklyProgressRow {
  week: string;
  avgLoad: number;
}

interface ReportLoadChartProps {
  data: WeeklyProgressRow[];
}

export function ReportLoadChart({ data }: ReportLoadChartProps) {
  return (
    <div className="h-[200px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            label={{ value: "Semana", position: "insideBottom", offset: -5 }}
          />
          <YAxis
            label={{ value: "Carga Média (kg)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="avgLoad"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="Carga Média"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
