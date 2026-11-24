INSERT INTO capture (id,interface,command,duration,filter,active) VALUES (1,'','tcpdump (desativado)','00:00:00','all',0);
INSERT INTO layers (id,protocols_json) VALUES ('application','["HTTP","DNS","SSH"]');
INSERT INTO layers (id,protocols_json) VALUES ('transport','["TCP","UDP"]');
INSERT INTO layers (id,protocols_json) VALUES ('network','["IP","ARP","Ethernet"]');
