// 404页

import React from "react";
import "./index.scss";

const NotFoundPage = () => {
  return (
    <div className="not-found-container">
      <h2 className="error-code">404</h2>
      <p className="error-message">Page not found</p>
    </div>
  );
};

export default NotFoundPage;
