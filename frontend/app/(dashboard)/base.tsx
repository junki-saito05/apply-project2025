"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import '../globals.css';
import { usePathname } from "next/navigation";
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ManageAccounts from '@mui/icons-material/ManageAccounts';
import PeopleIcon from '@mui/icons-material/People';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 「出張」セクションを開くかどうか
  const isTripOpen = isPreApply || isApply;

  // 「マスタ管理」セクションを開くかどうか
  const isMasterOpen = isUser || isDepartment || isApproval || isAllowance;

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
  }, [sidebarOpen]);

  return (
    <>
      {/* ハンバーガーボタン：ヘッダー内や画面上部に配置 */}
      <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
        &#9776;
      </button>
      <div
        className="sidebar-hover-area"
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      />
      {/* サイドバー本体 */}
      <aside
        className={`sidebar border-end shadow-sm${sidebarOpen ? " open" : ""}`}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <nav>
          <div className="list-group list-group-flush">
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li>
                <div className="list-group-item list-group-flush parent-list-group-item">
                  <details open={isTripOpen}>
                    <summary>出張<FlightTakeoffIcon sx={{ ml: 1, verticalAlign: 'middle' }} /></summary>
                    <ul>
                      <li>
                        <Link href="/trip/pre-apply" className={`list-group-item list-group-item-action child-list-group-item${isPreApply ? " active" : ""}`}>
                          事前申請
                          <AssignmentTurnedInIcon sx={{ ml: 1, verticalAlign: 'middle' }} />
                        </Link>
                      </li>
                      <li>
                        <Link href="/trip/apply" className={`list-group-item list-group-item-action child-list-group-item${isApply ? " active" : ""}`}>
                          精算申請
                          <ReceiptLongIcon sx={{ ml: 1, verticalAlign: 'middle' }} />
                        </Link>
                      </li>
                    </ul>
                  </details>
                </div>
              </li>
              {isMasterUser && (
                <li style={{ marginTop: 16 }}>
                  <div className="list-group-item list-group-flush parent-list-group-item">
                    <details open={isMasterOpen}>
                      <summary>マスタ管理<ManageAccounts sx={{ ml: 1, verticalAlign: 'middle' }} /></summary>
                      <ul>
                        <li>
                          <Link href="/master/user" className={`list-group-item list-group-item-action child-list-group-item${isUser ? " active" : ""}`}>
                            社員管理
                            <PeopleIcon sx={{ ml: 1, verticalAlign: 'middle' }} />
                          </Link>
                        </li>
                        <li>
                          <Link href="/master/department" className={`list-group-item list-group-item-action child-list-group-item${isDepartment ? " active" : ""}`}>
                            部門管理
                            <ApartmentIcon sx={{ ml: 1, verticalAlign: 'middle' }} />
                          </Link>
                        </li>
                        <li>
                          <Link href="/master/approval" className={`list-group-item list-group-item-action child-list-group-item${isApproval ? " active" : ""}`}>
                            承認ルート管理
                            <AltRouteIcon sx={{ ml: 1, verticalAlign: 'middle' }} />
                          </Link>
                        </li>
                        <li>
                          <Link href="/master/allowance" className={`list-group-item list-group-item-action child-list-group-item${isAllowance ? " active" : ""}`}>
                            手当管理
                            <MonetizationOnIcon sx={{ ml: 1, verticalAlign: 'middle' }} />
                          </Link>
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
    </>
  );
}
