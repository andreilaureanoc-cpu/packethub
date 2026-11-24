DELETE FROM nodes
WHERE id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
             '11', '12', '13', '14', '15', '16', '17', '18', '19', '20')
  AND host IN (
    'edge-sp01', 'core-db02', 'web-prod03', 'api-prod03', 'cache-sp04',
    'auth-prod05', 'edge-sp02', 'core-db03', 'web-prod04', 'api-prod04',
    'cache-sp05', 'auth-prod06', 'dns-rec01', 'mq-prod01', 'worker-bh01',
    'storage-sp01', 'proxy-sp02', 'vpn-gw01', 'telemetry01', 'backup-bh01'
  );
