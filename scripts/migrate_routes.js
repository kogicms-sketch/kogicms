const fs = require('fs');
const path = require('path');

const routes = [
  { path: '/', component: 'Login', isProtected: false },
  { path: '/dashboard', component: 'Dashboard', isProtected: true, roles: [] },
  { path: '/organization-admins', component: 'super-admin/OrganizationAdmins', isProtected: true, roles: ['super_admin', 'lga_chairman'] },
  { path: '/target-management', component: 'super-admin/TargetManagement', isProtected: true, roles: ['super_admin'] },
  { path: '/members', component: 'Members', isProtected: true, roles: [] },
  { path: '/members/[id]', component: 'MemberProfile', isProtected: true, roles: [] },
  { path: '/activities', component: 'Activities', isProtected: true, roles: [] },
  { path: '/reports', component: 'Reports', isProtected: true, roles: [] },
  { path: '/notifications', component: 'Dashboard', isProtected: true, roles: [] },
  { path: '/attendance', component: 'Attendance', isProtected: true, roles: [] },
  { path: '/chat', component: 'Chat', isProtected: true, roles: ['super_admin', 'org_admin', 'lga_chairman', 'councillor', 'senatorial_leader', 'federal_rep', 'house_assembly_member'] },
  { path: '/settings', component: 'Settings', isProtected: true, roles: [] },
  { path: '/post-generator', component: 'PostGenerator', isProtected: true, roles: [] },
  { path: '/files', component: 'org-admin/FileManager', isProtected: true, roles: ['super_admin', 'org_admin'] },
  { path: '/support-groups', component: 'SupportGroups', isProtected: true, roles: [] },
  { path: '/support-groups/[id]', component: 'SupportGroupDetail', isProtected: true, roles: [] },
  { path: '/events', component: 'CampaignEvents', isProtected: true, roles: [] },
  { path: '/talking-points', component: 'TalkingPoints', isProtected: true, roles: [] },
  { path: '/polling-units', component: 'PollingUnitCells', isProtected: true, roles: [] },
  { path: '/polling-units/[id]', component: 'PollingUnitDetail', isProtected: true, roles: [] },
  { path: '/situation-room', component: 'SituationRoom', isProtected: true, roles: [] },
  { path: '/chairman/dashboard', component: 'chairman/ChairmanDashboard', isProtected: true, roles: ['lga_chairman'] },
  { path: '/chairman/polling-units', component: 'chairman/ChairmanPollingUnits', isProtected: true, roles: ['lga_chairman'] },
  { path: '/chairman/councillors', component: 'chairman/ManageCouncillors', isProtected: true, roles: ['lga_chairman'] },
  { path: '/chairman/settings', component: 'chairman/ChairmanSettings', isProtected: true, roles: ['lga_chairman'] },
  { path: '/councillor/dashboard', component: 'councillor/CouncillorDashboard', isProtected: true, roles: ['councillor'] },
  { path: '/polling-units-reports', component: 'PollingUnitReports', isProtected: true, roles: ['super_admin', 'lga_chairman', 'councillor'] },
  { path: '/senatorial/dashboard', component: 'senatorial/SenatorialDashboard', isProtected: true, roles: ['senatorial_leader'] },
  { path: '/federal/dashboard', component: 'federal/FederalRepDashboard', isProtected: true, roles: ['federal_rep'] },
  { path: '/assembly/dashboard', component: 'assembly/AssemblyDashboard', isProtected: true, roles: ['house_assembly_member'] },
];

const appDir = path.join(__dirname, '..', 'src', 'app');

routes.forEach(route => {
  let routePath = route.path;
  if (routePath === '/') routePath = '';
  
  const targetDir = path.join(appDir, routePath);
  fs.mkdirSync(targetDir, { recursive: true });
  
  const targetFile = path.join(targetDir, 'page.tsx');
  
  let content = `"use client";\n\n`;
  
  // Need to adjust the component import path
  let compImportPath = `../../pages/${route.component}`;
  // Count how deep the route is to adjust relative path
  const depth = routePath ? routePath.split('/').length : 0;
  if (depth === 0) {
    compImportPath = `../pages/${route.component}`;
  } else if (depth > 1) {
    compImportPath = `${'../'.repeat(depth + 1)}pages/${route.component}`;
  }
  
  // Actually, we can use the `@/views/` alias which works in Next.js config
  compImportPath = `@/views/${route.component}`;
  
  content += `import Component from "${compImportPath}";\n`;
  
  if (route.isProtected) {
    content += `import { ProtectedRoute } from "@/components/ProtectedRoute";\n\n`;
    let rolesStr = route.roles && route.roles.length > 0 ? ` allowedRoles={${JSON.stringify(route.roles)}}` : '';
    content += `export default function Page() {\n`;
    content += `  return (\n`;
    content += `    <ProtectedRoute${rolesStr}>\n`;
    content += `      <Component />\n`;
    content += `    </ProtectedRoute>\n`;
    content += `  );\n`;
    content += `}\n`;
  } else {
    content += `\nexport default function Page() {\n`;
    content += `  return <Component />;\n`;
    content += `}\n`;
  }
  
  fs.writeFileSync(targetFile, content);
  console.log(`Created ${targetFile}`);
});
