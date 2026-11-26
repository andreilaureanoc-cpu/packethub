INSERT INTO "packet_storage" ("id", "total_bytes")
SELECT 1, COALESCE(SUM(
  length(CAST("id" AS BLOB)) +
  length(CAST("time" AS BLOB)) +
  length(CAST("src" AS BLOB)) +
  length(CAST("dst" AS BLOB)) +
  length(CAST("protocol" AS BLOB)) +
  length(CAST("info_json" AS BLOB)) +
  length(CAST("size" AS BLOB)) +
  length(CAST(COALESCE("source", '') AS BLOB)) +
  length(CAST(COALESCE("created_by_user_id", '') AS BLOB)) +
  CASE WHEN "dropped" IS NULL THEN 0 ELSE 1 END
), 0)
FROM "packets";

CREATE TRIGGER "packets_storage_after_insert"
AFTER INSERT ON "packets"
BEGIN
  UPDATE "packet_storage"
  SET "total_bytes" = "total_bytes" +
    length(CAST(NEW."id" AS BLOB)) +
    length(CAST(NEW."time" AS BLOB)) +
    length(CAST(NEW."src" AS BLOB)) +
    length(CAST(NEW."dst" AS BLOB)) +
    length(CAST(NEW."protocol" AS BLOB)) +
    length(CAST(NEW."info_json" AS BLOB)) +
    length(CAST(NEW."size" AS BLOB)) +
    length(CAST(COALESCE(NEW."source", '') AS BLOB)) +
    length(CAST(COALESCE(NEW."created_by_user_id", '') AS BLOB)) +
    CASE WHEN NEW."dropped" IS NULL THEN 0 ELSE 1 END
  WHERE "id" = 1;
END;

CREATE TRIGGER "packets_storage_after_update"
AFTER UPDATE ON "packets"
BEGIN
  UPDATE "packet_storage"
  SET "total_bytes" = "total_bytes"
    - length(CAST(OLD."id" AS BLOB))
    - length(CAST(OLD."time" AS BLOB))
    - length(CAST(OLD."src" AS BLOB))
    - length(CAST(OLD."dst" AS BLOB))
    - length(CAST(OLD."protocol" AS BLOB))
    - length(CAST(OLD."info_json" AS BLOB))
    - length(CAST(OLD."size" AS BLOB))
    - length(CAST(COALESCE(OLD."source", '') AS BLOB))
    - length(CAST(COALESCE(OLD."created_by_user_id", '') AS BLOB))
    - CASE WHEN OLD."dropped" IS NULL THEN 0 ELSE 1 END
    + length(CAST(NEW."id" AS BLOB))
    + length(CAST(NEW."time" AS BLOB))
    + length(CAST(NEW."src" AS BLOB))
    + length(CAST(NEW."dst" AS BLOB))
    + length(CAST(NEW."protocol" AS BLOB))
    + length(CAST(NEW."info_json" AS BLOB))
    + length(CAST(NEW."size" AS BLOB))
    + length(CAST(COALESCE(NEW."source", '') AS BLOB))
    + length(CAST(COALESCE(NEW."created_by_user_id", '') AS BLOB))
    + CASE WHEN NEW."dropped" IS NULL THEN 0 ELSE 1 END
  WHERE "id" = 1;
END;

CREATE TRIGGER "packets_storage_after_delete"
AFTER DELETE ON "packets"
BEGIN
  UPDATE "packet_storage"
  SET "total_bytes" = "total_bytes"
    - length(CAST(OLD."id" AS BLOB))
    - length(CAST(OLD."time" AS BLOB))
    - length(CAST(OLD."src" AS BLOB))
    - length(CAST(OLD."dst" AS BLOB))
    - length(CAST(OLD."protocol" AS BLOB))
    - length(CAST(OLD."info_json" AS BLOB))
    - length(CAST(OLD."size" AS BLOB))
    - length(CAST(COALESCE(OLD."source", '') AS BLOB))
    - length(CAST(COALESCE(OLD."created_by_user_id", '') AS BLOB))
    - CASE WHEN OLD."dropped" IS NULL THEN 0 ELSE 1 END
  WHERE "id" = 1;
END;
