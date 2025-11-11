import api from "@/scripts/fetch.api";

export const authlogin = async (email: string, password: string) => {
  console.log("🚀 ~ login ~ password:", password);
  console.log("🚀 ~ login ~ email:", email);
  try {
    const request = await api.post("/auth/login", { email, password });
    return request.data;
  } catch (err) {
    return err;
  }
};

export const authRegister = async ({
  lastName,
  firstName,
  email,
  password,
}: {
  lastName: string;
  firstName: string;
  email: string;
  password: string;
}) => {
  try {
    const request = await api.post("/auth/register", {
      firstName,
      lastName,
      email,
      password,
    });
    return request.data;
  } catch (err) {
    return err;
  }
};

export const authMe = async () => {
  try {
    const request = await api.get("/auth/me");
    return request.data;
  } catch (err) {
    return { status: false, err };
  }
};

export const authResetPassword = async (email: string) => {
  try {
    const request = await api.post("/auth/forgot-password", { email });
    return request.data;
  } catch (err) {
    return err;
  }
};
