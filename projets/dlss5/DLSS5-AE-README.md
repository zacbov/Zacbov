# DLSS 5 Neural Rendering for After Effects

A native Windows x64 After Effects effect that runs the supplied NVIDIA neural-rendering model on a layer's image. Find it under **Effect → AI Enhancement → DLSS 5 Neural Rendering**. Apply it to footage, a precomposition, or an adjustment layer.

This is an independent experimental integration of the community runtime's feature-18 interface. It is not an NVIDIA or Adobe product. Neural rendering changes image content; inspect faces, lettering, fine detail, and temporal consistency on your footage.

## Builds and installation

Four separately compiled adapters live in `dist/`:

`releases/DLSS5-AE-1.1.0-Windows.zip` contains all four builds, the local runtime, installer, source, and validation records. Extract it before running the installer. The package is intended for this local installation; see `THIRD_PARTY.md` for binary provenance and terms.

| Directory | Adobe SDK used |
| --- | --- |
| `SDK-May2023` | May 2023 |
| `SDK-25.2` | 25.2 build 20 |
| `SDK-25.6` | 25.6 build 61 |
| `SDK-26.5` | 26.5 |

The May 2023 adapter is the compatibility build for the installed After Effects **25.0.1x2**. Newer-SDK compilation does not constitute testing in a newer After Effects host. Only After Effects 2025 is installed on this machine.

All adapters use the same `dist/runtime/` engine and the locally supplied `nvngx_dlssnr.dll` and `nvngx_dlss.dll`. Install **one adapter per host**. Keep its accompanying `runtime` directory intact:

```text
Support Files/Plug-ins/DLSS5_AE/
    DLSS5.aex
    runtime/
        nvngx.dll_dlss5ae.dll
        nvngx_dlssnr.dll
        nvngx_dlss.dll
        av_denoise_ae.dll
```

Close After Effects before updating. From an administrator PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Sdk May2023
```

The installer saves any existing DLSS5_AE installation under `build/install-backups/`. Restart After Effects after installation. To uninstall, remove only the `DLSS5_AE` plug-in directory.

When updating from 1.0, replace **both `DLSS5.aex` and the complete `runtime` folder**. Version 1.1 adds `av_denoise_ae.dll` and changes the adapter/engine interface; mixing the old adapter with the new engine produces an interface error. No Rust, Python, Vulkan SDK, CUDA toolkit, or ReShade installation is needed to use the built effect. A suitable GPU driver is required. The DLSS stage still requires compatible NVIDIA hardware.

## Controls

| Control | Meaning |
| --- | --- |
| Enable Neural Rendering | Exact bypass when disabled |
| NR Preset | Default or the runtime's three numbered presets |
| NR Style | Default, Natural, Cinematic |
| Overall Intensity | Neural intensity, 0–2 |
| Global / Local Tone Intensity | Runtime tone controls, 0–2 |
| Structure Intensity | Runtime local structure control, 0–2 |
| Character / Skin Structure | -1 uses the model's native setting; range -1–1 |
| Automatic Character Mask | Runtime's built-in automatic mask |
| UI Correction | Runtime UI protection; off by default for footage |
| Neural Passes | 1–4 full neural passes |
| Effect Amount | 0% is the original; 100% applies the processed result |
| NR Color Strength | 0% retains source hue through luminance scaling; 100% uses model color |
| Optical Flow Scale | Multiplier applied to image-derived motion vectors |
| Scene Cut Threshold | Mean absolute luminance change that restarts history; 35% by default |
| Input Color Encoding | Display-referred RGB, or linear RGB with sRGB/Rec.709 primaries |
| Show Optical Flow | Red/green encode horizontal/vertical motion around neutral 0.5; 64 pixels per channel unit |
| If Runtime Fails | Stop with Error, or explicitly selected Pass Through |
| Denoise Output (av-denoise) | Enable spatial NLMeans-HQ after the neural passes; enabled by default |
| Denoise Strength | Multiplier on the automatically measured noise level, 0–4; default 1 |
| Denoise Amount | Blend between neural output and denoised output; default 100%; 0% bypasses denoising |
| Denoise Quality | Fast, Balanced, High; default Balanced; larger search windows cost more GPU time |

## Output denoising

Version 1.1 embeds the upstream **av-denoise NLMeans-HQ** implementation through a Rust C ABI and Vulkan. It processes full-range BT.709 YUV444 floats converted from the neural stage's display-referred RGB. The result returns to RGB before NR Color Strength and the final Effect Amount blend. Alpha is untouched, and values outside the denoiser's 0–1 range are retained as a residual. Strength 0, Denoise Amount 0, and the unchecked Denoise Output control bypass the denoiser. Disabling the effect or setting Effect Amount to 0 still bypasses the entire pipeline. Show Optical Flow bypasses output denoising so the vector display remains accurate.

Start with **Balanced, Strength 1, Amount 100%**. Increase Strength when generated grain remains; reduce Amount if fine detail becomes too smooth. Automatic estimation may apply almost no filtering to already clean images. Fast/Balanced/High use search radii 2/3/4 and a patch radius of 4. No prefilter is used.

This integration uses the single-frame NLMeans-HQ path. It does not expose NL4D or a temporal denoising window. The existing optical-flow motion generator continues to supply DLSS. The denoiser resets its stream and measures noise independently for each requested frame, preserving random-access rendering. Spatial denoising does not specifically solve temporal flicker.

Vulkan kernels are compiled for the local GPU on first use and cached by av-denoise under its platform cache directory (normally `%LOCALAPPDATA%/av-denoise` on Windows). The first render for a new quality setting can take longer. The runtime uses the first discrete Vulkan GPU; AMD and NVIDIA are supported by upstream's Vulkan backend, but only the local RTX 5090 has been tested here. This does not broaden the DLSS runtime's hardware support.

Set Input Color Encoding to match the image arriving at the effect. For ACES/OCIO or other wide-gamut work, convert into display-referred sRGB or linear sRGB before the effect and back afterward. This version does not automatically interpret the project's OCIO configuration. The tests use a separate Adobe color-managed project and do not change your saved color preferences.

Source alpha is preserved. RGB is unpremultiplied before processing and premultiplied afterward; fully transparent source pixels retain their original values. 16-bit AE pixels use Adobe's 0–32768 scale. 32-bit source values outside the model's 0–1 range are retained as a residual around the processed range; the model itself is not a full HDR neural pipeline.

## Motion and rendering behavior

Motion comes exclusively from a GPU implementation of pyramidal Lucas–Kanade optical flow. There are no game buffers, camera matrices, inferred geometry, or generated depth maps. The runtime receives a constant zero depth texture solely to satisfy its resource contract.

For every requested frame, SmartFX checks out the complete upstream image and the preceding frame at the effect's input. This includes the underlying composite for adjustment layers. Each render resets and replays that explicit frame pair, so backward scrubbing and multiframe rendering cannot accidentally reuse another layer's history. Missing history and scene cuts use zero motion and a history reset.

The engine serializes GPU work per process. AE multiframe rendering is accepted, but the neural GPU work is not evaluated concurrently. A request uses up to two evaluations per neural pass. This favors repeatability over long accumulated video history; it does not reproduce a game's full temporal integration, and difficult motion or cuts can still produce artifacts.

The effect preserves image dimensions. Small images are padded to at least 64×64; dimensions are padded to multiples of eight internally and cropped back. The supported boundary is 7680×4320 in either orientation. There is no super-resolution resize or frame interpolation in this effect.

## Build and validation

Run `build.cmd` from this directory. It configures the installed Visual Studio 2022 Community x64 toolchain, builds the common engine, generates each SDK's PiPL resource with Adobe's PiPLtool, and compiles all four `.aex` files. `build.cmd -EngineOnly` and `build.cmd -SkipEngine` support iterative development.

The engine build first compiles `denoiser/Cargo.toml` using `scripts/build-denoiser.ps1`. That script uses a Windows Rust toolchain on PATH or the project-local toolchain under `build/tools/`; dependencies are pinned by `denoiser/Cargo.lock`. `-SkipDenoiser` reuses the already built denoiser DLL. The core av-denoise source is vendored under `third_party/av-denoise`. Development requires the Rust toolchain and MSVC; installed users need only the adapter and runtime DLLs.

The SDK paths in `scripts/build.ps1` refer to the supplied packages under `D:\CodexTemp\AfterEffectsSDK`. The two Zstandard ZIP SDK packages have been extracted alongside their archives. The NGX headers and link library are under `third_party/ngx`; their provenance and licenses are recorded in `THIRD_PARTY.md`.

- `dist/runtime/engine_smoke.exe`: neural output, alpha, exact repeatability, optical-flow direction, multipass, bypass, and style-change tests.
- `dist/runtime/denoiser_smoke.exe`: measured synthetic noise reduction and edge contrast in all three quality modes, alpha, repeatability, strength/amount, zero bypass, and HDR residual checks.
- `tests/ae_smoke.jsx`: a fresh-process AE render-queue test of normal/adjustment layers, 8/16/32 bpc, alpha, bypass, seeking, motion visualization, and model controls. It creates a saved test project for aerender.
- `tests/compare_renders.py`: compares actual host render pixels using Pillow. AE dithers 16/32-bit images during 8-bit PNG export; the test measures repeated unprocessed exports and allows at most one output code value of quantization variance. Native floating-point repeatability and bypass are tested separately.
- `tests/run_host.ps1`: runs the isolated AE script test, then four frames through `aerender` with multiframe rendering enabled. `-AerenderOnly` reuses the saved test project.
- `tests/ae-output/`: host reports, rendered frames, saved `.aep`, and pixel comparison results.

Recorded results and their limits are in [TEST_RESULTS.md](TEST_RESULTS.md). To repeat the host validation after installing a build:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\run_host.ps1
python -m pip install -r .\tests\requirements.txt
python .\tests\compare_renders.py --aerender
```

Run `python scripts/package.py` to rebuild the local archive and its SHA-256 file. Packaging verifies all adapter and runtime hashes against the manifests before assembling the archive.

Runtime diagnostics are written to `%LOCALAPPDATA%\DLSS5AE\DLSS5-engine.log`. Set `DLSS5_AE_TRACE=1` only on a test process to enable `DLSS5-host.log` with SmartFX checkout details. No diagnostic environment variable is required for normal use.

The engine uses Windows SRW locks because the installed AE host bundles Microsoft C++ runtime 14.23, while the compiler is MSVC 14.44. This avoids the newer `std::mutex` initialization ABI that caused an access violation in the first host integration test. The Rust bridge retains its DLL until process exit because CubeCL owns persistent GPU threads, matching upstream's Windows plugin integration. The bridge's own worker and denoiser allocations are released on effect shutdown.
