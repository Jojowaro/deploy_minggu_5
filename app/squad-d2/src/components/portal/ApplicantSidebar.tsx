"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  ChevronDown,
  User,
  X,
  Briefcase,
  FileCheck,
} from "lucide-react";

export interface ApplicantSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  activeItem?: "jobs" | "register" | "kanban";
}

export const ApplicantSidebar: React.FC<ApplicantSidebarProps> = ({
  mobileOpen,
  onMobileClose,
  activeItem,
}) => {
  const pathname = usePathname() || "";
  const isKanbanActive = activeItem === "kanban" || pathname.includes("kanban");
  const isJobActive = activeItem === "jobs" || pathname.includes("jobs");
  const isRegisterActive =
    activeItem === "register" || pathname.includes("register");

  const [kanbanDropdownOpen, setKanbanDropdownOpen] = useState(true);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(true);

  return (
    <>
      {/* Mobile Backdrop Overlay (< 1024px) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0b1329] text-white flex flex-col justify-between select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Company Brand Header */}
          <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
            <Link href="/kanban" onClick={onMobileClose}>
              <h1 className="text-[13px] font-bold tracking-wider text-slate-100 uppercase">
                PT ANDIMA TRANSPORTINDO
              </h1>
            </Link>
            {/* Close Button on Mobile/Tablet */}
            <button
              type="button"
              onClick={onMobileClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Section */}
          <div className="px-4 py-6 space-y-4">
            <p className="px-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              MAIN MENU
            </p>

            {/* Menu Group 1: KANBAN PORTAL (Figma HRMS D - HR.jpg) */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setKanbanDropdownOpen(!kanbanDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="tracking-wide">KANBAN PORTAL</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    kanbanDropdownOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>

              {/* Sub-menu Items */}
              {kanbanDropdownOpen && (
                <div className="mt-1 space-y-1 pl-3">
                  <Link
                    href="/kanban"
                    onClick={onMobileClose}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      isKanbanActive
                        ? "bg-slate-800/70 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                        isKanbanActive
                          ? "bg-[#8b5cf6] ring-2 ring-[#8b5cf6]/40"
                          : "bg-slate-500"
                      }`}
                    />
                    <span className="truncate">Kanban & Fit - Proprer</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Menu Group 2: JOB PORTAL */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span className="tracking-wide">JOB PORTAL</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    portalDropdownOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>

              {/* Sub-menu Items */}
              {portalDropdownOpen && (
                <div className="mt-1 space-y-1 pl-3">
                  <Link
                    href="/jobs"
                    onClick={onMobileClose}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      isJobActive
                        ? "bg-slate-800/70 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/40"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                        isJobActive
                          ? "bg-[#6366f1] ring-2 ring-[#6366f1]/30"
                          : "bg-slate-500"
                      }`}
                    />
                    <span className="truncate">Job List & Register</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="px-4 py-4 border-t border-slate-800/80 flex items-center justify-between bg-[#080e1e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#179c77] text-white font-bold text-xs flex items-center justify-center shrink-0">
              BS
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">
                Budi Santoso
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                Applicant Portal
              </span>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 cursor-pointer">
            <User className="w-3.5 h-3.5" />
          </div>
        </div>
      </aside>
    </>
  );
};

export default ApplicantSidebar;
