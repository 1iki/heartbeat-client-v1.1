"use client";

import { useState } from "react";
import { AuthConfig } from "@/types";

interface AuthConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (authConfig: AuthConfig) => void;
    initialConfig?: AuthConfig;
    testUrl?: string;
}

export function AuthConfigModal({
    isOpen,
    onClose,
    onSave,
    initialConfig,
    testUrl
}: AuthConfigModalProps) {
    const [config, setConfig] = useState<AuthConfig>(initialConfig || {
        type: "BROWSER_LOGIN",
        loginUrl: "",
        loginType: "page",
        username: "",
        password: "",
        usernameSelector: "",
        passwordSelector: "",
        submitSelector: "",
        loginSuccessSelector: "",
        modalTriggerSelector: ""
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    if (!isOpen) return null;

    const handleTest = async () => {
        if (!testUrl) {
            setTestResult({ success: false, message: "URL not provided" });
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const response = await fetch("/api/nodes/test-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: testUrl, authConfig: config })
            });

            const data = await response.json();
            setTestResult({
                success: data.success,
                message: data.message || data.error || "Test completed"
            });
        } catch (error: any) {
            setTestResult({
                success: false,
                message: error.message || "Test failed"
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="glass border border-white/10 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Konfigurasi Otentikasi</h2>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Login URL */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Login URL <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="url"
                            value={config.loginUrl || ""}
                            onChange={(e) => setConfig({ ...config, loginUrl: e.target.value })}
                            placeholder="https://example.com/login"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-400"
                        />
                        <p className="text-xs text-white/40 mt-1">
                            URL halaman login (biarkan kosong untuk menggunakan URL utama)
                        </p>
                    </div>

                    {/* Login Type */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Tipe Login
                        </label>
                        <select
                            value={config.loginType || "page"}
                            onChange={(e) => setConfig({ ...config, loginType: e.target.value as "page" | "modal" })}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-400 [&>option]:bg-gray-800 [&>option]:text-white [&>option]:py-2"
                        >
                            <option value="page" className="bg-gray-800 text-white">Halaman Login Terpisah</option>
                            <option value="modal" className="bg-gray-800 text-white">Modal/Popup Login</option>
                        </select>
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Username/Email <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={config.username || ""}
                            onChange={(e) => setConfig({ ...config, username: e.target.value })}
                            placeholder="user@example.com"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-400"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="password"
                            value={config.password || ""}
                            onChange={(e) => setConfig({ ...config, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-400"
                        />
                    </div>

                    {/* Advanced Options Toggle */}
                    <div>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-sm text-blue-400 hover:text-blue-300 transition flex items-center gap-2"
                        >
                            {showAdvanced ? "▼" : "▶"} Opsi Lanjutan (Selektor Kustom)
                        </button>
                    </div>

                    {/* Advanced Options */}
                    {showAdvanced && (
                        <div className="space-y-4 pl-4 border-l-2 border-white/10">
                            <p className="text-xs text-white/60">
                                Biarkan kosong untuk deteksi otomatis. Gunakan pemilih CSS jika deteksi otomatis gagal.
                            </p>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Selektor Username
                                </label>
                                <input
                                    type="text"
                                    value={config.usernameSelector || ""}
                                    onChange={(e) => setConfig({ ...config, usernameSelector: e.target.value })}
                                    placeholder='input[name="email"]'
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Selektor Password
                                </label>
                                <input
                                    type="text"
                                    value={config.passwordSelector || ""}
                                    onChange={(e) => setConfig({ ...config, passwordSelector: e.target.value })}
                                    placeholder='input[name="password"]'
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Selektor Tombol Submit
                                </label>
                                <input
                                    type="text"
                                    value={config.submitSelector || ""}
                                    onChange={(e) => setConfig({ ...config, submitSelector: e.target.value })}
                                    placeholder='button[type="submit"]'
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Selektor Elemen Verifikasi (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={config.loginSuccessSelector || ""}
                                    onChange={(e) => setConfig({ ...config, loginSuccessSelector: e.target.value })}
                                    placeholder='.user-profile, #dashboard'
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-sm"
                                />
                                <p className="text-xs text-white/40 mt-1">
                                    Elemen yang muncul hanya saat login berhasil (untuk menghilangkan peringatan).
                                </p>
                            </div>

                            {config.loginType === "modal" && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Selektor Pemicu Modal
                                    </label>
                                    <input
                                        type="text"
                                        value={config.modalTriggerSelector || ""}
                                        onChange={(e) => setConfig({ ...config, modalTriggerSelector: e.target.value })}
                                        placeholder='button.login-trigger'
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Test Result */}
                    {testResult && (
                        <div className={`p-4 rounded-lg ${testResult.success
                            ? "bg-green-500/20 border border-green-500/30"
                            : "bg-red-500/20 border border-red-500/30"
                            }`}>
                            <p className="text-sm">{testResult.message}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleTest}
                            disabled={testing || !config.username || !config.password}
                            className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {testing ? "Menguji..." : "Uji Login"}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!config.username || !config.password}
                            className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Simpan Konfigurasi
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
