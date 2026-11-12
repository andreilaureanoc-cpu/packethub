export type Packet = {
  id: string;
  time: string;
  src: string;
  dst: string;
  protocol: string;
  info: string | Record<string, unknown>;
  size: string;
  dropped?: boolean;
};

export type NewPacket = Omit<Packet, "id">;

export type NodeRecord = {
  id: string;
  host: string;
  ip: string;
  service: string;
  latency: string;
  load: string;
  status: string;
};

export type NewNode = Omit<NodeRecord, "id">;

export type Capture = {
  interface: string;
  command: string;
  duration: string;
  filter: string;
  active: boolean;
};

export type NetworkLayer = {
  id: string;
  protocols: string[];
};
