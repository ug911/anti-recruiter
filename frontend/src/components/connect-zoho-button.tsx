'use client';

import { Button } from "@/components/ui/button";

export function ConnectZohoButton() {
    return (
        <Button variant="outline" onClick={() => window.location.href = "http://localhost:8000/auth/zoho/login"}>
            Connect Zoho
        </Button>
    );
}
