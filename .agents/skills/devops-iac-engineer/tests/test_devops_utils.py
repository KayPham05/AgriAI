import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "devops_utils.py"
SPEC = importlib.util.spec_from_file_location("devops_utils", SCRIPT)
devops_utils = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(devops_utils)


class DevopsUtilsTests(unittest.TestCase):
    def invoke(self, arguments: list[str]) -> int:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return devops_utils.main(arguments)

    def test_terraform_starter_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            arguments = ["terraform", "init-project", "--name", "demo", "--output", directory]
            self.assertEqual(self.invoke(arguments), 0)
            target = Path(directory) / "demo" / "main.tf"
            original = target.read_text(encoding="utf-8")
            self.assertEqual(self.invoke(arguments), 2)
            self.assertEqual(target.read_text(encoding="utf-8"), original)

    def test_invalid_project_name_cannot_escape_output(self):
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            devops_utils.main(["terraform", "init-project", "--name", "../outside"])

    def test_gitops_environments_and_duplicate_rejection(self):
        with tempfile.TemporaryDirectory() as directory:
            arguments = ["gitops", "init", "--tool", "argocd", "--output", directory]
            self.assertEqual(self.invoke([*arguments, "--environments", "dev,dev"]), 2)
            self.assertFalse((Path(directory) / "gitops").exists())
            self.assertEqual(self.invoke([*arguments, "--environments", "dev,prod"]), 0)
            self.assertTrue((Path(directory) / "gitops" / "prod" / "kustomization.yaml").is_file())

    def test_kubernetes_generation_is_valid_json_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "deployment.yaml"
            arguments = ["k8s", "generate", "--name", "demo", "--image", "example/app:1.0", "--output", str(target)]
            self.assertEqual(self.invoke(arguments), 0)
            manifest = json.loads(target.read_text(encoding="utf-8"))
            self.assertEqual(manifest["spec"]["selector"]["matchLabels"], manifest["spec"]["template"]["metadata"]["labels"])
            self.assertFalse(manifest["spec"]["template"]["spec"]["automountServiceAccountToken"])
            self.assertEqual(self.invoke(arguments), 2)

    def test_invalid_image_is_not_written(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "deployment.yaml"
            self.assertEqual(self.invoke(["k8s", "generate", "--name", "demo", "--image", "bad image", "--output", str(target)]), 2)
            self.assertFalse(target.exists())

    def test_missing_tool_fails_instead_of_claiming_pass(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(devops_utils.shutil, "which", return_value=None):
            self.assertEqual(self.invoke(["terraform", "validate", "--file", directory]), 2)

    def test_native_validation_propagates_failure(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(devops_utils.shutil, "which", return_value="terraform"), patch.object(devops_utils.subprocess, "run") as native:
            native.return_value.returncode = 1
            self.assertEqual(self.invoke(["terraform", "validate", "--file", directory]), 1)
            native.assert_called_once_with(["terraform", "validate", "-no-color"], cwd=Path(directory).resolve(), timeout=120, check=False)

    def test_kubernetes_uses_server_dry_run(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(devops_utils, "run_tool", return_value=0) as native:
            target = Path(directory) / "fixture.yaml"
            target.write_text("{}", encoding="utf-8")
            self.assertEqual(self.invoke(["k8s", "validate", "--file", str(target)]), 0)
            self.assertEqual(native.call_args.args[1], ["apply", "--dry-run=server", "--validate=strict", "-f", str(target.resolve())])

    def test_secret_scan_is_redacted_and_propagates_findings(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(devops_utils, "run_tool", return_value=1) as native:
            self.assertEqual(self.invoke(["security", "scan-secrets", "--directory", directory]), 1)
            self.assertIn("--redact", native.call_args.args[1])

    def test_native_timeout_is_error(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(devops_utils, "run_tool", side_effect=devops_utils.subprocess.TimeoutExpired("terraform", 120)):
            self.assertEqual(self.invoke(["terraform", "validate", "--file", directory]), 2)


if __name__ == "__main__":
    unittest.main()
