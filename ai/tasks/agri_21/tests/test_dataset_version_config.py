import os
import subprocess
import sys
import unittest


class DatasetVersionConfigTests(unittest.TestCase):
    def test_default_version_is_v1_4(self) -> None:
        environment = os.environ.copy()
        environment.pop("AGRIVISION_DATASET_VERSION", None)
        result = subprocess.run(
            [sys.executable, "-c", "from ai.configs import config; print(config.DATASET_VERSION)"],
            env=environment,
            text=True,
            capture_output=True,
            check=True,
        )
        self.assertEqual(result.stdout.strip(), "v1.4")

    def test_environment_override_is_used_for_checkpoint_metadata(self) -> None:
        environment = os.environ.copy()
        environment["AGRIVISION_DATASET_VERSION"] = "v1.3"
        result = subprocess.run(
            [sys.executable, "-c", "from ai.configs import config; print(config.DATASET_VERSION)"],
            env=environment,
            text=True,
            capture_output=True,
            check=True,
        )

        self.assertEqual(result.stdout.strip(), "v1.3")


if __name__ == "__main__":
    unittest.main()
