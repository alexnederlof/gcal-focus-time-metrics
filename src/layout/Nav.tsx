import React from "react";

export interface NavProps {
  user: {
    name: string;
    picture?: string;
  };
}

export function Nav({ user }: NavProps) {
  return (
    <nav className="navbar fixed-top bg-light">
      <div className="container-fluid">
        <a className="navbar-brand" href="#">
          Focus time calculator
        </a>
        <a href="/logout">Log out {user.name}</a>
      </div>
    </nav>
  );
}
