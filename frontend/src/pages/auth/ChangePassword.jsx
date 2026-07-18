import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      const response = await api.post(
        "/auth/change-temporary-password",
        form
      );

      const result = response.data?.data;

      const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const updatedUser = {
        ...storedUser,
        must_change_password: false,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setMessage(
        response.data?.message ||
          "Password changed successfully."
      );

      setTimeout(() => {
        navigate("/designer/dashboard", {
          replace: true,
        });
      }, 800);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Failed to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <form onSubmit={handleSubmit}>
        <h1>Change Password</h1>

        <p>
          You must change your temporary password before
          continuing.
        </p>

        {message && (
          <div className="success-alert">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="error-alert">
            {errorMessage}
          </div>
        )}

        <input
          type="password"
          name="current_password"
          placeholder="Current temporary password"
          value={form.current_password}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="new_password"
          placeholder="New password"
          value={form.new_password}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="confirm_password"
          placeholder="Confirm new password"
          value={form.confirm_password}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}