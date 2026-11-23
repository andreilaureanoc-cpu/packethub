import assert from "node:assert/strict";
import test from "node:test";
import {
  encontrarHostDoEndpoint,
  resumirProtocolosDoHost,
} from "../dist/client/models/hostTraffic.js";

const host = {
  id: "1",
  host: "gateway",
  ip: "192.0.2.1",
  service: "gateway",
  latency: "1 ms",
  load: "0%",
  status: "Operacional",
};

test("matches registered hosts with captured IPv4 and IPv6 endpoints", () => {
  assert.equal(encontrarHostDoEndpoint("192.0.2.1.443", [host]), host);
  assert.equal(encontrarHostDoEndpoint("192.0.2.10.443", [host]), undefined);
  assert.equal(
    encontrarHostDoEndpoint("2001:db8::1.53", [
      { ...host, ip: "2001:db8::1" },
    ])?.host,
    "gateway",
  );
});

test("summarizes captured protocols, including ICMP, without counting manual rows", () => {
  const pacotes = [
    {
      id: "1",
      time: "12:00:00.000",
      src: "192.0.2.1",
      dst: "198.51.100.1",
      protocol: "ICMP",
      info: "echo request",
      size: "64 B",
      source: "capture",
    },
    {
      id: "2",
      time: "12:00:01.000",
      src: "198.51.100.1",
      dst: "192.0.2.1.443",
      protocol: "TCP",
      info: "SYN",
      size: "64 B",
      source: "capture",
    },
    {
      id: "3",
      time: "12:00:02.000",
      src: "192.0.2.1",
      dst: "198.51.100.2",
      protocol: "ICMP",
      info: "echo reply",
      size: "64 B",
      source: "manual",
    },
  ];

  assert.deepEqual(resumirProtocolosDoHost(host, pacotes), [
    { protocol: "ICMP", count: 1 },
    { protocol: "TCP", count: 1 },
  ]);
});
