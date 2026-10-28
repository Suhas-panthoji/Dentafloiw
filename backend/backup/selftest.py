import sys
import time
from .storage import BackupStorage

def main():
    storage = BackupStorage(); key = f"_healthcheck/{int(time.time())}.enc"; plain = b"dentaflow-backup-healthcheck"
    try:
        encrypted = storage.encrypt(plain); storage.put_if_absent(key, encrypted); storage.verify(key, encrypted); print("PASS write + HEAD")
        if storage.decrypt(storage.get(key)) != plain: raise RuntimeError("decryption mismatch")
        print("PASS download + decrypt"); storage.delete_healthcheck(key); print("PASS delete")
    except Exception as exc:
        print("FAIL", type(exc).__name__); return 1
    return 0
if __name__ == "__main__": sys.exit(main())
