import { apiRequest } from './api';

export async function requestVideoUploadUrl(payload) {
  return apiRequest('/videos/upload-url', {
    method: 'POST',
    body: payload,
  });
}

export async function createVideo(payload) {
  return apiRequest('/videos', {
    method: 'POST',
    body: payload,
  });
}

export async function getCategories() {
  return apiRequest('/categories', {
    method: 'GET',
  });
}

export async function getTags() {
  return apiRequest('/tags', {
    method: 'GET',
  });
}

export async function attachTagsToVideo(videoId, payload) {
  return apiRequest(`/videos/${videoId}/tags`, {
    method: 'POST',
    body: payload,
  });
}

export async function createModerationQueue(payload) {
  return apiRequest('/moderation-queue', {
    method: 'POST',
    body: payload,
  });
}

export async function getExternalPostingPlans() {
  return apiRequest('/external-posting-plans', {
    method: 'GET',
  });
}

export async function createExternalPostingSubscription(payload) {
  return apiRequest('/creator/external-posting-subscriptions', {
    method: 'POST',
    body: payload,
  });
}

export async function getCurrentExternalPostingSubscription() {
  return apiRequest('/creator/external-posting-subscriptions/current', {
    method: 'GET',
  });
}

export function uploadFileToSignedUrl(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(true);
      } else {
        reject(new Error(`Failed to upload file to storage (${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading file'));
    };

    xhr.send(file);
  });
}