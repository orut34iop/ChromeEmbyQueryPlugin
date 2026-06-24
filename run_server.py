import os
import subprocess
import sys


def run_server():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    server_script = os.path.join(project_dir, "server.py")

    # Prefer uv if available: it will sync the virtual environment and run server.py.
    uv_path = shutil.which("uv")
    if uv_path:
        print("检测到 uv，使用 uv 运行 server.py...")
        try:
            subprocess.run([uv_path, "run", "python", server_script], cwd=project_dir, check=True)
            return
        except subprocess.CalledProcessError as e:
            print(f"使用 uv 运行失败：{e}", file=sys.stderr)
            sys.exit(1)

    # Fallback: activate a local .venv virtual environment.
    venv_path = os.path.join(project_dir, ".venv")
    if os.path.isdir(venv_path):
        print("未检测到 uv，使用 .venv 运行 server.py...")
        python_executable = os.path.join(venv_path, "bin", "python")
        if os.path.exists(python_executable):
            try:
                subprocess.run([python_executable, server_script], cwd=project_dir, check=True)
                return
            except subprocess.CalledProcessError as e:
                print(f"运行 server.py 时出错：{e}", file=sys.stderr)
                sys.exit(1)
        else:
            print(f"在 {venv_path} 中找不到 Python 可执行文件", file=sys.stderr)
            sys.exit(1)

    print(
        "未找到运行环境。请安装 uv（https://docs.astral.sh/uv/）并运行 `uv sync`，"
        "或创建 .venv 虚拟环境并安装依赖。",
        file=sys.stderr,
    )
    sys.exit(1)


if __name__ == "__main__":
    import shutil

    run_server()
