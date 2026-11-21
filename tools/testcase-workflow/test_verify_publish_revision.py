import io
import subprocess
import unittest
from contextlib import redirect_stderr
from unittest.mock import call, patch

from verify_publish_revision import main


class PublishRevisionTests(unittest.TestCase):
    @patch("verify_publish_revision.subprocess.check_output")
    def test_current_main_can_publish(self, git):
        git.side_effect = ["bbb\trefs/heads/main\n", "bbb\n"]

        self.assertEqual(main(), 0)
        self.assertEqual(git.call_args_list, [
            call(["git", "ls-remote", "--exit-code", "origin", "refs/heads/main"], text=True),
            call(["git", "rev-parse", "HEAD"], text=True),
        ])

    @patch("verify_publish_revision.subprocess.check_output")
    def test_stale_rerun_cannot_publish(self, git):
        git.side_effect = ["bbb\trefs/heads/main\n", "aaa\n"]

        with redirect_stderr(io.StringIO()) as error:
            self.assertEqual(main(), 1)
        self.assertIn("outdated main revision", error.getvalue())

    @patch("verify_publish_revision.subprocess.check_output")
    def test_cannot_publish_when_remote_lookup_fails(self, git):
        git.side_effect = subprocess.CalledProcessError(2, "git")

        with redirect_stderr(io.StringIO()) as error:
            self.assertEqual(main(), 1)
        self.assertIn("Could not verify current main revision", error.getvalue())
        git.assert_called_once()

    @patch("verify_publish_revision.subprocess.check_output")
    def test_similarly_named_ref_does_not_authorize_publish(self, git):
        git.side_effect = ["bbb\trefs/tags/refs/heads/main\n", "bbb\n"]

        with redirect_stderr(io.StringIO()) as error:
            self.assertEqual(main(), 1)
        self.assertIn("Could not verify current main revision", error.getvalue())
