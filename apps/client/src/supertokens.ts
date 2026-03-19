import SuperTokens from "supertokens-auth-react";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import ThirdParty from "supertokens-auth-react/recipe/thirdparty";
import Session from "supertokens-auth-react/recipe/session";

const apiDomain = import.meta.env.VITE_API_URL || "http://localhost:8000";

SuperTokens.init({
  appInfo: {
    appName: "AI Apply Agents",
    apiDomain,
    websiteDomain: window.location.origin,
    apiBasePath: "/auth",
    websiteBasePath: "/auth",
  },
  recipeList: [
    EmailPassword.init(),
    ThirdParty.init({
      signInAndUpFeature: {
        providers: [{ id: "google", name: "Google" }],
      },
    }),
    Session.init(),
  ],
});
