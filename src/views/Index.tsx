"use client";
import { useEffect } from "react";
import { useRouter } from 'next/navigation';

const Index = () => {
  const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };

  useEffect(() => {
    // Redirect to login page
    navigate("/");
  }, [navigate]);

  return null;
};

export default Index;
