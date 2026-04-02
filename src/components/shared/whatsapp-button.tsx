"use client";

import React from "react";
import "./whatsapp-button.css";

export function WhatsAppButton() {
  const phoneNumber = "9542762906";
  const message = "Hii, Enquire from BHOOKR website";

  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="whatsapp-float-container">
      <button
        onClick={handleClick}
        className="whatsapp-float-button"
        aria-label="Contact us on WhatsApp"
        type="button"
      >
        {/* Rotating Text Circle */}
        <svg
          className="rotating-text"
          viewBox="0 0 100 100"
          width="80"
          height="80"
        >
          <defs>
            <path
              id="circlePath"
              d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
            />
          </defs>
          <text className="circular-text">
            <textPath xlinkHref="#circlePath" startOffset="0%">
              HAVE ANY DOUBTS? TALK TO US • • •
            </textPath>
          </text>
        </svg>

        {/* WhatsApp Icon */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
            alt="WhatsApp"
            style={{
              width: "50px",
              height: "50px",
            }}
          />
        </div>
      </button>
    </div>
  );
}
