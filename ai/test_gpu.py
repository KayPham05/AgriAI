import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

def test_environment():
    print("=" * 60)
    print("🔍 KIỂM TRA MÔI TRƯỜNG PHẦN CỨNG VÀ PYTORCH CUDA")
    print("=" * 60)
    print(f"[*] Python Version: {sys.version.split()[0]}")

    try:
        import torch
        print(f"[*] PyTorch Version: {torch.__version__}")
        cuda_available = torch.cuda.is_available()
        print(f"[*] CUDA Available: {cuda_available}")

        if not cuda_available:
            print("\n[!] Chú ý: PyTorch chưa nhận được GPU CUDA!")
            print("[!] Để cài đặt PyTorch hỗ trợ GPU CUDA, vui lòng chạy lệnh:")
            print("    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124")
            return False

        gpu_name = torch.cuda.get_device_name(0)
        vram_mb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 2)
        print(f"[*] Tên GPU: {gpu_name}")
        print(f"[*] Tổng VRAM: {vram_mb:.0f} MiB")

        import torchvision.models as models
        if __package__:
            from ai.configs import config
        else:
            from configs import config

        # Test forward pass with dummy tensor
        print(
            "\n[*] Đang kiểm tra Forward Pass với mô hình và "
            f"batch size = {config.BATCH_SIZE}..."
        )
        model = models.convnext_tiny(weights=None)
        model.classifier[2] = torch.nn.Linear(
            model.classifier[2].in_features,
            config.EXPECTED_NUM_CLASSES,
        )
        model.cuda()

        dummy_input = torch.randn(
            config.BATCH_SIZE,
            3,
            config.IMAGE_SIZE,
            config.IMAGE_SIZE,
            device="cuda",
        )
        with torch.amp.autocast("cuda"):
            output = model(dummy_input)

        if not torch.isfinite(output).all():
            raise RuntimeError("Forward pass AMP sinh giá trị NaN/Inf")

        mem_allocated = torch.cuda.memory_allocated(0) / (1024 ** 2)
        print(f"[*] Output shape: {output.shape}")
        print(
            f"[*] VRAM sử dụng cho batch {config.BATCH_SIZE}: "
            f"~{mem_allocated:.1f} MiB"
        )
        print("\n✅ MÔI TRƯỜNG ĐÃ SẴN SÀNG 100% ĐỂ HUẤN LUYỆN!")
        print("=" * 60)
        return True

    except ModuleNotFoundError as e:
        print(f"\n[!] Thư viện chưa được cài đặt: {e}")
        print("[!] Bạn hãy chạy lệnh sau để cài đặt PyTorch CUDA:")
        print("    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124")
        print("    pip install -r requirements.txt")
        return False
    except Exception as e:
        print(f"\n[!] Lỗi phát sinh: {e}")
        return False

if __name__ == "__main__":
    test_environment()
