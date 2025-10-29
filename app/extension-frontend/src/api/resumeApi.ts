const API_BASE_URL = "http://127.0.0.1:8000/api";

export const uploadResume = async (file: File): Promise<{ file_url: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "File upload failed");
  }

  return response.json();
};