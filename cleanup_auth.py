import os
import shutil

paths_to_remove = [
    r"frontend\src\components\Auth",
    r"frontend\src\hooks\useAuth.ts",
    r"frontend\src\services\authService.ts",
    r"frontend\src\types\auth.ts",
    r"src\api\v1\auth_router.py",
    r"src\api\schemas\auth.py",
    r"src\api\services\social_auth.py",
    r"src\api\dependencies\auth.py"
]

for path in paths_to_remove:
    try:
        if os.path.exists(path):
            if os.path.isdir(path):
                shutil.rmtree(path)
                print(f"Deleted directory: {path}")
            else:
                os.remove(path)
                print(f"Deleted file: {path}")
        else:
            print(f"Path does not exist: {path}")
    except Exception as e:
        print(f"Error deleting {path}: {e}")
