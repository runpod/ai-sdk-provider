export type RunpodImageModelId =
  | 'qwen/qwen-image'
  | 'qwen/qwen-image-edit'
  | 'qwen/qwen-image-edit-2511'
  | 'bytedance/seedream-3.0'
  | 'bytedance/seedream-4.0'
  | 'bytedance/seedream-4.0-edit'
  | 'black-forest-labs/flux-1-kontext-dev'
  | 'black-forest-labs/flux-1-schnell'
  | 'black-forest-labs/flux-1-dev'
  // Alibaba Wan 2.6 (t2i)
  | 'alibaba/wan-2.6'
  // Tongyi Z-Image Turbo (t2i)
  | 'tongyi-mai/z-image-turbo'
  // Nano Banana (edit only)
  | 'google/nano-banana-edit'
  | 'nano-banana-edit'; // backwards compatibility
