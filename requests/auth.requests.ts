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

/**
 * L'API n'accepte plus que des comptes professionnels : `company` et `siret`
 * sont obligatoires, et tout champ hors de cette liste fait échouer la requête
 * (ValidationPipe en `forbidNonWhitelisted` côté serveur).
 *
 * L'erreur est propagée telle quelle pour que l'appelant puisse lire
 * `error.response.data.message` — un `return err` la ferait passer pour un succès.
 */
export const authRegister = async ({
  lastName,
  firstName,
  company,
  siret,
  email,
  password,
  phone,
}: {
  lastName: string;
  firstName: string;
  company: string;
  siret: string;
  email: string;
  password: string;
  phone?: string;
}) => {
  const request = await api.post("/auth/register", {
    firstName,
    lastName,
    company,
    siret,
    email,
    password,
    ...(phone ? { phone } : {}),
  });
  return request.data;
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
