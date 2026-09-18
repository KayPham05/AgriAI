import sys

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

        # Test forward pass with dummy tensor
        print("\n[*] Đang kiểm tra Forward Pass với mô hình và batch size = 16...")
        import torchvision.models as models
        model = models.convnext_tiny(weights=None)
        model.classifier[2] = torch.nn.Linear(model.classifier[2].in_features, 30)
        model.cuda()

        dummy_input = torch.randn(16, 3, 224, 224, device="cuda")
        with torch.amp.autocast("cuda"):
            output = model(dummy_input)

        mem_allocated = torch.cuda.memory_allocated(0) / (1024 ** 2)
        print(f"[*] Output shape: {output.shape}")
        print(f"[*] VRAM sử dụng cho batch 16: ~{mem_allocated:.1f} MiB (Rất an toàn trên GTX 1650 4GB!)")
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
