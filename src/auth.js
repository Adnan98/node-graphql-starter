import jwt from "jsonwebtoken";
import _ from "lodash";
import bcrypt from "bcryptjs";

export const createTokens = (user, secret, secret2) => {
  const createToken = jwt.sign(
    {
      user: _.pick(user, ["id", "username"]) // Take the id of the user
    },
    secret,
    {
      expiresIn: "1h"
    }
  );

  const createRefreshToken = jwt.sign(
    {
      user: _.pick(user, "id")
    },
    secret2,
    {
      expiresIn: "7d"
    }
  );

  return [createToken, createRefreshToken];
};

export const refreshTokens = async (
  token,
  refreshToken,
  models,
  SECRET,
  SECRET2
) => {
  let userId = 0;
  try {
    const {
      user: { id }
    } = jwt.decode(refreshToken);
    userId = id;
  } catch (err) {
    return {};
  }

  if (!userId) {
    return {};
  }

  const user = await models.User.findOne({ where: { id: userId }, raw: true });

  if (!user) {
    return {};
  }

  const refreshSecret = user.password + SECRET2;

  try {
    jwt.verify(refreshToken, refreshSecret);
  } catch (err) {
    return {};
  }

  const [newToken, newRefreshToken] = await createTokens(
    user,
    SECRET,
    refreshSecret
  );
  return {
    token: newToken,
    refreshToken: newRefreshToken,
    user
  };
};

export const tryLogin = async (email, password, models, SECRET, SECRET2) => {
  const user = await models.User.findOne({ where: { email }, raw: true });
  if (!user) {
    // user with provided email not found
    return {
      ok: false,
      errors: [{ path: "email", message: "Wrong email" }]
    };
  }

  // Compare the entered password with the hashed password in the database
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    // The password was invalid:
    return {
      ok: false,
      errors: [{ path: "password", message: "Wrong password" }]
    };
  }

  // The email and password is both valid

  /* We are putting the hashed password of the user in front of the SECRET2
   * when we create the refresTokenSecret
   * If the user changes their password, the refreshtoken will automatically
   * expire and they have to login again
   */
  const refreshTokenSecret = user.password + SECRET2;

  const [token, refreshToken] = await createTokens(
    user,
    SECRET,
    refreshTokenSecret
  );

  return {
    ok: true,
    token,
    refreshToken
  };
};
