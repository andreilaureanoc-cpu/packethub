export type Resource = "packets" | "nodes";

export type PacketRecord = {
  id: string;
  time: string;
  src: string;
  dst: string;
  protocol: string;
  info: string | Record<string, unknown>;
  size: string;
  dropped?: boolean;
};

export type NodeRecord = {
  id: string;
  host: string;
  ip: string;
  service: string;
  latency: string;
  load: string;
  status: string;
};

export type Capture = {
  interface: string;
  command: string;
  duration: string;
  filter: string;
  active: boolean;
};

export type CaptureFilter = {
  id: string;
  label: string;
};

export type CaptureOptions = {
  enabled: boolean;
  interfaces: string[];
  filters: CaptureFilter[];
  message: string;
};

export type NetworkLayer = {
  id: string;
  protocols: string[];
};

export type ProtocolSummary = {
  name: string;
  total: number;
  percentage: string;
  label: string;
};

export type PacketSummary = {
  captured: number;
  rate: number;
  dataLabel: string;
  droppedPct: string | null;
  protocols: ProtocolSummary[];
};
