"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import '../globals.css';
import { usePathname } from "next/navigation";

export default function Base() {
  const { data: session } = useSession();
  const isMasterUser = session?.user?.hasMasterPermission === true;
  const pathname = usePathname();
  const isPreApply = pathname.startsWith("/trip/pre-apply");
  const isApply = pathname.startsWith("/trip/apply");
  const isUser = pathname.startsWith("/master/user");
  const isDepartment = pathname.startsWith("/master/department");
  const isApproval = pathname.startsWith("/master/approval");
  const isAllowance = pathname.startsWith("/master/allowance");

  // 「出張」セクションを開くかどうか
  const isTripOpen = isPreApply || isApply;

  // 「マスタ管理」セクションを開くかどうか
  const isMasterOpen = isUser || isDepartment || isApproval || isAllowance;

  return (
    <aside className="sidebar border-end shadow-sm">
      <nav>
        <div className="list-group list-group-flush">
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <div className="list-group-item list-group-flush parent-list-group-item">
                <details open={isTripOpen}>
                  <summary>出張</summary>
                  <ul>
                    <li>
                      <Link href="/trip/pre-apply" className={`list-group-item list-group-item-action child-list-group-item${isPreApply ? " active" : ""}`}>事前申請</Link>
                    </li>
                    <li>
                      <Link href="/trip/apply" className={`list-group-item list-group-item-action child-list-group-item${isApply ? " active" : ""}`}>精算申請</Link>
                    </li>
                  </ul>
                </details>
              </div>
            </li>
            {isMasterUser && (
              <li style={{ marginTop: 16 }}>
                <div className="list-group-item list-group-flush parent-list-group-item">
                  <details open={isMasterOpen}>
                    <summary>マスタ管理</summary>
                    <ul>
                      <li>
                        <Link href="/master/user" className={`list-group-item list-group-item-action child-list-group-item${isUser ? " active" : ""}`}>社員管理</Link>
                      </li>
                      <li>
                        <Link href="/master/department" className={`list-group-item list-group-item-action child-list-group-item${isDepartment ? " active" : ""}`}>部門管理</Link>
                      </li>
                      <li>
                        <Link href="/master/approval" className={`list-group-item list-group-item-action child-list-group-item${isApproval ? " active" : ""}`}>承認ルート管理</Link>
                      </li>
                      <li>
                        <Link href="/master/allowance" className={`list-group-item list-group-item-action child-list-group-item${isAllowance ? " active" : ""}`}>手当管理</Link>
                      </li>
                    </ul>
                  </details>
                </div>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
