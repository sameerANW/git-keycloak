import keycloak from "@/libs/pkg/keycloak";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const AuthContext = createContext({
  isAuthenticated: false,
  token: null,
  user: null,
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setAuth] = useState(false);
  const [token, setToken] = useState(null);
  const isRun = useRef(false);

  const getUserInfo = async (token) => {
    if (!token) {
      login();
      return;
    }
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 200) {
        const data = await res.json();
        setUser(data);
        setAuth(true);
      } else {
        login();
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error);
      login();
    }
  };

  const login = async () => {
    if (isRun.current) return;
    isRun.current = true;
    try {
      const res = await keycloak.init({
        onLoad: "login-required",
      });
      setAuth(res);
      setCookie("access_token", keycloak.token);
      await getUserInfo(keycloak.token);
    } catch (error) {
      console.error("Failed to initialize Keycloak:", error);
    }
  };

  const logout = useCallback(async () => {
    try {
      await keycloak.logout();
      deleteCookie('access_token');
      window.location.href =
        `${process.env.NEXT_PUBLIC_KEYCLOAK_URL}/realms/${process.env.NEXT_PUBLIC_KEYCLOAK_REALM}/protocol/openid-connect/logout?post_logout_redirect_uri=${window.location.origin}&client_id=${process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT}`;
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  }, []);

  useEffect(() => {
    if (!getCookie("access_token")) {
      login();
    } else {
      setToken(getCookie("access_token"));
      getUserInfo(getCookie("access_token"));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
