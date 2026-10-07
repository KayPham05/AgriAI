import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


def resource_name(value: str) -> str:
    if len(value) > 63 or not re.fullmatch(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*", value):
        raise argparse.ArgumentTypeError("Use 1-63 lowercase letters, digits and hyphens; start with a letter.")
    return value


def existing_path(value: str) -> Path:
    path = Path(value).resolve(strict=True)
    return path


def write_new(path: Path, content: str) -> None:
    with path.open("x", encoding="utf-8", newline="\n") as output:
        output.write(content)


def new_project(output: str, name: str) -> Path:
    parent = Path(output).resolve(strict=True)
    if not parent.is_dir():
        raise ValueError("Output must be an existing directory.")
    target = parent / resource_name(name)
    target.mkdir()
    return target


def run_tool(tool: str, arguments: list[str], cwd: Path | None = None) -> int:
    executable = shutil.which(tool)
    if executable is None:
        raise FileNotFoundError(f"Required tool is not installed or not on PATH: {tool}")
    return subprocess.run([executable, *arguments], cwd=cwd, timeout=120, check=False).returncode


def deployment(name: str, image: str, namespace: str) -> dict:
    resource_name(name)
    resource_name(namespace)
    if not image.strip() or any(character.isspace() for character in image):
        raise ValueError("Image must be a non-empty container image reference without whitespace.")
    return {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {"name": name, "namespace": namespace},
        "spec": {
            "replicas": 1,
            "selector": {"matchLabels": {"app": name}},
            "template": {
                "metadata": {"labels": {"app": name}},
                "spec": {
                    "automountServiceAccountToken": False,
                    "containers": [{
                        "name": name,
                        "image": image,
                        "securityContext": {"allowPrivilegeEscalation": False, "capabilities": {"drop": ["ALL"]}},
                        "resources": {"requests": {"cpu": "100m", "memory": "128Mi"}, "limits": {"cpu": "500m", "memory": "256Mi"}},
                    }],
                },
            },
        },
    }


def execute(arguments: argparse.Namespace) -> int:
    if arguments.area == "terraform" and arguments.action == "init-project":
        target = new_project(arguments.output, arguments.name)
        write_new(target / "main.tf", 'terraform {\n  required_version = ">= 1.5.0"\n}\n')
        write_new(target / "outputs.tf", f'output "project_name" {{\n  value = "{arguments.name}"\n}}\n')
        write_new(target / ".gitignore", ".terraform/\n*.tfstate*\n*.tfvars\n!*.tfvars.example\n*.tfplan\n")
        write_new(target / "README.md", f"# {arguments.name}\n\nTarget cloud: {arguments.cloud}; region: {arguments.region}.\n\nLocal starter only; no provider, credentials or cloud resources.\n")
        print(target)
        return 0
    if arguments.area == "terraform":
        path = existing_path(arguments.file)
        directory = path if path.is_dir() else path.parent
        return run_tool("terraform", ["validate", "-no-color"], cwd=directory)
    if arguments.area == "k8s" and arguments.action == "generate":
        target = Path(arguments.output).absolute()
        write_new(target, json.dumps(deployment(arguments.name, arguments.image, arguments.namespace), indent=2) + "\n")
        print(target)
        return 0
    if arguments.area == "k8s":
        path = existing_path(arguments.file)
        if not path.is_file():
            raise ValueError("Kubernetes input must be a file.")
        return run_tool("kubectl", ["apply", "--dry-run=server", "--validate=strict", "-f", str(path)])
    if arguments.area == "security":
        path = existing_path(arguments.directory)
        if not path.is_dir():
            raise ValueError("Scan input must be a directory.")
        return run_tool("gitleaks", ["dir", str(path), "--redact", "--no-banner"])
    environments = [resource_name(value.strip()) for value in arguments.environments.split(",")]
    if len(environments) != len(set(environments)):
        raise ValueError("Environment names must be unique.")
    target = new_project(arguments.output, arguments.name)
    write_new(target / "README.md", f"# {arguments.name}\n\nIntended tool: {arguments.tool}. No controller installed and no auto-sync enabled.\n")
    for environment in environments:
        folder = target / environment
        folder.mkdir()
        write_new(folder / "kustomization.yaml", "apiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources: []\n")
    print(target)
    return 0


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Local starters and native validation; no deployment or overwrite.")
    areas = root.add_subparsers(dest="area", required=True)
    terraform_actions = areas.add_parser("terraform").add_subparsers(dest="action", required=True)
    terraform_init = terraform_actions.add_parser("init-project")
    terraform_init.add_argument("--name", type=resource_name, required=True)
    terraform_init.add_argument("--cloud", choices=["aws", "azure", "gcp"], default="aws")
    terraform_init.add_argument("--region", type=resource_name, default="us-east-1")
    terraform_init.add_argument("--output", default=".")
    terraform_actions.add_parser("validate").add_argument("--file", required=True)
    k8s_actions = areas.add_parser("k8s").add_subparsers(dest="action", required=True)
    k8s_actions.add_parser("validate").add_argument("--file", required=True)
    generate = k8s_actions.add_parser("generate")
    generate.add_argument("--name", type=resource_name, required=True)
    generate.add_argument("--image", required=True)
    generate.add_argument("--namespace", type=resource_name, default="default")
    generate.add_argument("--output", default="deployment.yaml")
    gitops_actions = areas.add_parser("gitops").add_subparsers(dest="action", required=True)
    gitops_init = gitops_actions.add_parser("init")
    gitops_init.add_argument("--name", type=resource_name, default="gitops")
    gitops_init.add_argument("--tool", choices=["argocd", "flux"], required=True)
    gitops_init.add_argument("--environments", default="dev,staging,prod")
    gitops_init.add_argument("--output", default=".")
    security_actions = areas.add_parser("security").add_subparsers(dest="action", required=True)
    security_actions.add_parser("scan-secrets").add_argument("--directory", default=".")
    return root


def main(argv: list[str] | None = None) -> int:
    arguments = parser().parse_args(argv)
    try:
        return execute(arguments)
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
