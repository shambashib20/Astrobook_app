// Cloudinary pe seedha video upload — no transformation bandwidth limits.
// ImageKit ka free plan video delivery quota ki limit hai; Cloudinary 25GB/month
// free mein deta hai bina aise restrictions ke.
//
// Setup (ek baar karo):
//  1. https://cloudinary.com pe free account banao
//  2. Dashboard → Settings → Upload → Upload Presets → Add upload preset
//     - Signing Mode: "Unsigned"
//     - Folder: "astrobook/intro-videos" (optional)
//     - Delivery type: "upload"
//  3. App .env mein do vars add karo:
//       EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=<your_cloud_name>
//       EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<your_unsigned_preset_name>

import { useState } from "react";
import { Alert } from "react-native";

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

// Cloudinary ka direct unsigned upload endpoint
const CLOUDINARY_VIDEO_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

export function useCloudinaryVideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Returns the secure Cloudinary URL, or null on failure
  const uploadVideo = async (
    videoUri: string,
    fileName: string,
    folder: string = "astrobook/intro-videos",
  ): Promise<string | null> => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      // Fallback warning — env vars missing (setup nahi hua abhi tak)
      Alert.alert(
        "Video Upload Config Missing",
        "Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file.",
      );
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", CLOUDINARY_VIDEO_UPLOAD_URL);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          let response: any;
          try {
            response = JSON.parse(xhr.responseText);
          } catch {
            reject(new Error("Invalid response from Cloudinary"));
            return;
          }
          if (xhr.status === 200 && response.secure_url) {
            resolve(response.secure_url as string);
          } else {
            reject(new Error(response?.error?.message || `Upload failed (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during video upload"));

        const formData = new FormData();
        formData.append("file", {
          uri: videoUri,
          type: "video/mp4",
          name: fileName,
        } as any);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("folder", folder);
        formData.append("resource_type", "video");

        xhr.send(formData);
      });

      return url;
    } catch (err: any) {
      console.error("Cloudinary video upload error:", err.message);
      Alert.alert("Video Upload Error", err.message || "Video upload failed — please try again");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadVideo, uploading, progress };
}
