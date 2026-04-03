import { apiRequest } from './api';

export async function requestVideoUploadUrl(payload) {
  return apiRequest('/videos/upload-url', {
    method: 'POST',
    body: payload,
  });
}

export async function uploadVideoFileToBackend(file, onProgress) {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('videogad_token') ||
    localStorage.getItem('authToken') ||
    '';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('video_file', file);

    xhr.open('POST', '/api/videos/upload-file', true);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      let responseData = null;

      try {
        responseData = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch (error) {
        responseData = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(responseData);
      } else {
        reject(
          new Error(
            responseData?.message ||
              `Failed to upload video file to backend (${xhr.status})`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading video file to backend'));
    };

    xhr.send(formData);
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