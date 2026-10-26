from pathlib import Path
import pymysql

env = {}
for line in Path(r"E:\Project\SmartHire-AI\backend\.env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

mysql_host = env["TENANT_MYSQL_BASE_URL"].split("://", 1)[1].split(":")[0]
root_pw = env.get("MYSQL_ROOT_PASSWORD") or env.get("TENANT_PROVISIONING_PASSWORD")
db_name = "smarthire_tenant_ttqt"

m = pymysql.connect(host=mysql_host, user="root", password=root_pw, database=db_name, connect_timeout=15)
c = m.cursor()
c.execute(
    """
    SELECT installed_rank, version, description, script, checksum, success, installed_on
    FROM flyway_schema_history
    WHERE version IN ('53','54','55') OR script LIKE '%V55%'
    ORDER BY installed_rank
    """
)
print("history:")
for row in c.fetchall():
    print(row)

c.execute("SHOW COLUMNS FROM tests")
print("\ntests columns:")
for row in c.fetchall():
    print(row[0], row[1])

c.execute("SHOW COLUMNS FROM email_outbox")
print("\nemail_outbox columns:")
for row in c.fetchall():
    print(row[0], row[1])

c.execute("SHOW COLUMNS FROM coding_problems")
print("\ncoding_problems columns:")
for row in c.fetchall():
    print(row[0], row[1])

c.execute("SHOW COLUMNS FROM answers LIKE 'custom%'")
print("\nanswers custom*:", c.fetchall())
m.close()
