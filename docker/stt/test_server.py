"""Unit tests for the STT service helpers (no model download needed).

The faster_whisper package is stubbed via sys.modules so the tests run in CI
without GPU weights; the request/response contract is covered against a real
FastAPI TestClient when available.
"""

import io
import struct
import sys
import types
import unittest
import wave


def make_wav(frames=1600, rate=16000):
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(struct.pack(f"<{frames}h", *([1000] * frames)))
    return buffer.getvalue()


class ServiceHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, "/Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/docker/stt")

    def _service(self):
        import server

        return server

    def test_normalize_language(self):
        server = self._service()
        self.assertEqual(server.normalize_language("de"), "de")
        self.assertEqual(server.normalize_language(" DE "), "de")
        # plausible 2-letter codes pass through (the model rejects
        # unsupported ones with a clear 503); junk falls back to auto
        self.assertEqual(server.normalize_language("xx"), "xx")
        self.assertEqual(server.normalize_language("xyz"), "auto")
        self.assertEqual(server.normalize_language(None), "auto")
        self.assertEqual(server.normalize_language(""), "auto")

    def test_validate_audio_bytes(self):
        server = self._service()
        ok, reason = server.validate_audio_bytes(b"")
        self.assertFalse(ok)
        ok, _ = server.validate_audio_bytes(b"RIFF....WAVE" + b"\x00" * 200)
        self.assertFalse(ok)  # truncated headers
        ok, _ = server.validate_audio_bytes(make_wav())
        self.assertTrue(ok)
        ok, reason = server.validate_audio_bytes(b"x" * (26 * 1024 * 1024))
        self.assertFalse(ok)
        self.assertIn("25 MB", reason)

    def test_transcribe_joins_segments(self):
        import server

        seen = {}

        class FakeModel:
            def transcribe(self, audio, language=None, **kwargs):
                seen["language"] = language
                return [types.SimpleNamespace(text="Guten"), types.SimpleNamespace(text="Morgen")], {}

        server._model = FakeModel()
        try:
            text = server.transcribe_bytes(make_wav(), "de")
        finally:
            server._model = None
        self.assertEqual(text, "Guten Morgen")
        # language ids flow through to the model
        self.assertEqual(seen["language"], "de")

    def test_endpoints_with_test_client(self):
        try:
            from fastapi.testclient import TestClient
        except Exception as exc:
            self.skipTest(f"fastapi test client unavailable: {exc}")
            return

        import server

        class FakeModel:
            def transcribe(self, audio, language=None, **kwargs):
                return [types.SimpleNamespace(text="Hallo Welt")], {}

        server._model = FakeModel()
        try:
            client = TestClient(server.app)
            health = client.get("/health")
            self.assertEqual(health.status_code, 200)
            self.assertEqual(health.json()["status"], "ok")

            wav = make_wav()
            response = client.post(
                "/transcribe",
                files={"file": ("utterance.wav", wav, "audio/wav")},
                data={"language": "de"},
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["text"], "Hallo Welt")

            bad = client.post("/transcribe", files={"file": ("x.wav", b"", "audio/wav")})
            self.assertEqual(bad.status_code, 400)
        finally:
            server._model = None


if __name__ == "__main__":
    unittest.main(verbosity=2)
