import { useState } from "react";
import { Alert } from "react-native";
import { postsService } from "../services/posts.service";
import type { Comment, CreatePostPayload, Post } from "../types/post.types";

// ─── useCreatePost ────────────────────────────────────────────────────────────

export function useCreatePost(onSuccess?: (post: Post) => void) {
  const [loading, setLoading] = useState(false);

  const createPost = async (payload: CreatePostPayload) => {
    if (!payload.content.trim()) {
      Alert.alert("Required", "Post content likhna zaroori hai");
      return;
    }
    setLoading(true);
    try {
      const post = await postsService.createPost(payload);
      onSuccess?.(post);
      return post;
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Post nahi bana");
    } finally {
      setLoading(false);
    }
  };

  return { createPost, loading };
}

// ─── useMyPosts ───────────────────────────────────────────────────────────────

export function useMyPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await postsService.getMyPosts();
      setPosts(data);
    } catch {
      Alert.alert("Error", "Posts load nahi hue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deletePost = async (id: string) => {
    try {
      await postsService.deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      Alert.alert("Error", "Post delete nahi hua");
    }
  };

  return { posts, loading, refreshing, fetchPosts, deletePost };
}

// ─── useImageKitUpload ────────────────────────────────────────────────────────
// ImageKit pe image upload karne ke liye

export function useImageKitUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (
    imageUri: string,
    fileName: string,
    folder: string = "/astrobook/posts",
    mimeType: string = "image/jpeg", // video ke liye "video/mp4" pass karo
  ): Promise<string | null> => {
    setUploading(true);
    try {
      const authToken = await postsService.getImageKitToken();

      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");

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
            reject(new Error("Invalid response from ImageKit"));
            return;
          }
          console.log("ImageKit response:", response);
          if (xhr.status === 200) {
            resolve(response.url);
          } else {
            reject(new Error(response?.message || "Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));

        const formData = new FormData();
        formData.append("file", {
          uri: imageUri,
          type: mimeType,
          name: fileName,
        } as any);
        formData.append("fileName", fileName);
        formData.append(
          "publicKey",
          process.env.EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY ?? "",
        );
        formData.append("signature", authToken.signature);
        formData.append("expire", String(authToken.expire));
        formData.append("token", authToken.token);
        formData.append("folder", folder);

        xhr.send(formData);
      });

      return url;
    } catch (err: any) {
      console.log("Upload error:", err.message);
      Alert.alert("Upload Error", err.message || "Image upload nahi hua");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading, progress };
}

// ─── useLikePost ──────────────────────────────────────────────────────────────
// Optimistic update — turant UI update ho jaata hai, backend fail ho toh revert

export function useLikePost() {
  const toggleLike = async (
    post: Post,
    onUpdate: (updated: Post) => void,
  ) => {
    const optimistic: Post = {
      ...post,
      isLikedByMe: !post.isLikedByMe,
      likesCount: post.isLikedByMe ? post.likesCount - 1 : post.likesCount + 1,
    };
    onUpdate(optimistic);
    try {
      if (post.isLikedByMe) {
        await postsService.unlikePost(post.id);
      } else {
        await postsService.likePost(post.id);
      }
    } catch {
      onUpdate(post); // revert on fail
    }
  };

  return { toggleLike };
}

// ─── useComments ──────────────────────────────────────────────────────────────

export function useComments(postId: string | undefined) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetchComments = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await postsService.getComments(postId);
      setComments(data);
    } catch {
      // silent — comments section sirf khaali dikhega
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (content: string): Promise<boolean> => {
    if (!postId || !content.trim()) return false;
    setPosting(true);
    try {
      const comment = await postsService.addComment(postId, content.trim());
      setComments((prev) => [...prev, comment]);
      return true;
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Comment nahi ho paya");
      return false;
    } finally {
      setPosting(false);
    }
  };

  return { comments, loading, posting, fetchComments, addComment };
}
