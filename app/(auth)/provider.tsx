"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { UserDetailContext } from "@/context/UserDetailContext";
import Header from "../_components/Header";

const Provider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    CreateNewUser();
  }, []);

  const [userDetail, setUserDetail] = useState(null);

  const CreateNewUser = async () => {
    //user API endpoint to create a new user
    const result = await axios.post("/api/user", {});
    console.log(result.data);
    setUserDetail(result?.data);
  };

  return (
    <div>
      <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
        <div className="max-w-7xl mx-auto">
                <Header/>
          {children}</div>
      </UserDetailContext.Provider>
    </div>
  );
};

export default Provider;
