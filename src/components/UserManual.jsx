import { useState, useMemo } from 'react';
import { X, Search, BookOpen, Grid, Package, Award, FileText, Users, ChevronRight } from 'lucide-react';

export default function UserManual({ currentUser, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const userRole = currentUser?.role || 'user';

  // Dynamic role-filtered manual contents in a structured format
  const manualSections = useMemo(() => {
    const sections = [];

    // 1. Overview (All Roles)
    const getRoleActions = () => {
      if (userRole === 'admin') {
        return 'ขั้นตอนการทำงานประจำวันสำหรับ Admin:\n' +
          '1. [ตรวจสอบและอนุมัติใบเสนอราคา] -> ไปที่หน้าจัดการใบเสนอราคา ตรวจเช็คเอกสารที่พนักงานขาย (User/Manager) ส่งมา หากถูกต้อง ให้กดปุ่ม "อนุมัติ" (Approve) เพื่อปลดล็อกให้พนักงานดาวน์โหลดเอกสารไปส่งให้ลูกค้าได้\n' +
          '2. [จัดการสิทธิ์และความปลอดภัยพนักงาน] -> เข้าหน้ารายชื่อผู้ใช้งาน เพื่อเพิ่มบัญชีพนักงานใหม่ ปรับเปลี่ยนระดับสิทธิ์ (Admin / Manager / User) หรือช่วยตั้งรหัสผ่านใหม่เมื่อมีพนักงานลืม\n' +
          '3. [เฝ้าดูล็อกและประวัติระบบ] -> สังเกตไอคอนระฆังแจ้งเตือนสั่นที่มุมขวาบนเมื่อมีการดัดแปลงข้อมูลสินค้า/เอกสาร เพื่อสืบประวัติว่าพนักงานท่านใดเป็นผู้แก้ไข และลบล็อกเก่าเพื่อคืนพื้นที่ข้อมูล\n' +
          '4. [เคลียร์ข้อมูลสินค้าคงคลังหลัก] -> กดลบรายการสินค้าที่เลิกจำหน่าย หรือลบชื่อแบรนด์/หมวดหมู่ที่ไม่ได้ขายออกจากระบบถาวร';
      }
      if (userRole === 'manager') {
        return 'ขั้นตอนการทำงานประจำวันสำหรับ Manager:\n' +
          '1. [บริหารและปรับปรุงข้อมูลสินค้า] -> กดปุ่ม "เพิ่มสินค้าใหม่" เพื่อลงทะเบียนสินค้าชิ้นใหม่ หรือใช้ปุ่ม "นำเข้า Excel" เพื่อดึงข้อมูลสินค้าจากไฟล์ Shopee / TikTok / PIM Excel เข้าฐานข้อมูลทีละหลายสิบรายการพร้อมกัน\n' +
          '2. [ปรับราคาสินค้าเป็นกลุ่ม (Bulk Update)] -> ติ๊กเลือกรายการสินค้าในตาราง แล้วกดปุ่ม "ปรับปรุงราคาเป็นกลุ่ม" เพื่อระบุจำนวนเงินหรือเปอร์เซ็นต์ที่ต้องการลด/เพิ่มราคาสินค้ากลุ่มนั้นพร้อมกันทันที\n' +
          '3. [ควบคุมรายชื่อแบรนด์และหมวดหมู่] -> เข้าเมนูแบรนด์/หมวดหมู่เพื่อเพิ่มหรือปรับปรุงชื่อหลัก (เมื่อแก้ไขชื่อแบรนด์หรือหมวดหมู่ สินค้าในระบบทุกชิ้นจะอัปเดตชื่อตามโดยอัตโนมัติ)\n' +
          '4. [ดูแลบัญชีพนักงานขาย] -> เพิ่มบัญชีผู้ใช้งานใหม่สำหรับระดับพนักงานทั่วไป (User) หรือช่วยพนักงานทั่วไปรีเซ็ตรหัสผ่าน';
      }
      return 'ขั้นตอนการทำงานประจำวันสำหรับ User (พนักงานทั่วไป/พนักงานขาย):\n' +
        '1. [เช็คราคาสินค้าส่งลูกค้า] -> พิมพ์ค้นหาด้วยชื่อสินค้า รหัส หรือสแกนบาร์โค้ดสินค้าที่ช่องค้นหา เพื่อเช็คราคาขาย สเปก ขนาด น้ำหนัก หรือดึงรูปภาพส่งให้ลูกค้า\n' +
        '2. [สร้างเอกสารใบเสนอราคา] -> ไปที่หน้าใบเสนอราคา กด "สร้างใบเสนอราคา" กรอกรายชื่อลูกค้าเก่า (ข้อมูลที่อยู่จะดึงมาเติมให้อัตโนมัติ) และเลือกสินค้าที่จะขายพร้อมกรอกจำนวนและส่วนลด\n' +
        '3. [คัดลอกลิงก์แชร์ออนไลน์ให้ลูกค้า] -> คัดลอกลิงก์แชร์ของใบเสนอราคาที่สร้าง ส่งให้ลูกค้าตรวจทานทางแชท เมื่อลูกค้าเปิดดูบนมือถือและกดปุ่ม "ยอมรับเอกสาร" ระบบจะเปลี่ยนสถานะเป็นอนุมัติให้อัตโนมัติทันที\n' +
        '4. [สั่งพิมพ์หรือบันทึก PDF] -> เมื่อใบเสนอราคาได้รับการอนุมัติ (Approved) แล้ว ให้กดปุ่ม "เปิด PDF" หรือ "ดาวน์โหลด PDF" เพื่อนำไปใช้งานหรือสั่งพิมพ์ออกเครื่องพิมพ์ได้ทันที';
    };

    sections.push({
      id: 'overview',
      title: 'ภาพรวมระบบ (System Overview)',
      icon: BookOpen,
      keywords: 'แนะนำ ภาพรวม ระบบ พิม pim-system บริษัท พันธ์วาดี จำกัด',
      allowedRoles: ['admin', 'manager', 'user'],
      subSections: [
        {
          type: 'info',
          heading: 'ยินดีต้อนรับสู่ PIM-SYSTEM',
          text: 'ยินดีต้อนรับสู่คู่มือการใช้งานระบบ PIM-SYSTEM ของ บริษัท พันธ์วาดี จำกัด หน้าคู่มือฉบับนี้ได้รับการปรับแต่งเนื้อหาตามระดับสิทธิ์การใช้งานของคุณอัตโนมัติ เพื่อให้แสดงข้อมูลเฉพาะฟังก์ชันที่คุณมีสิทธิ์เข้าถึงเท่านั้น'
        },
        {
          type: 'paragraph',
          heading: 'สิทธิ์เข้าใช้งานปัจจุบัน',
          text: `ปัจจุบันคุณเข้าใช้งานในระบบด้วยบทบาท: ${userRole === 'admin' ? 'Admin (ผู้ดูแลระบบ)' : userRole === 'manager' ? 'Manager (ผู้จัดการ)' : 'User (พนักงานทั่วไป)'}`
        },
        {
          type: 'list',
          heading: `ขั้นตอนการใช้งานระบบ (สำหรับบทบาทของคุณ)`,
          text: getRoleActions()
        }
      ]
    });

    // 1.5. Roles Guide (All Roles)
    sections.push({
      id: 'roles-guide',
      title: 'คู่มือแยกตามระดับสิทธิ์ (User Roles Guide)',
      icon: Users,
      keywords: 'สิทธิ์ บทบาท แอดมิน ผู้จัดการ ทั่วไป admin manager user หน้าที่ ใครทำอะไรได้',
      allowedRoles: ['admin', 'manager', 'user'],
      subSections: [
        {
          type: 'info',
          heading: 'สรุปการแบ่งขั้นตอนการใช้งานตามสิทธิ์พนักงาน (User Roles Workflows)',
          text: 'ระบบแบ่งผู้ใช้งานออกเป็น 3 สิทธิ์ เพื่อจำกัดการเข้าถึงข้อมูลทางการเงินและการบันทึกข้อมูลสินค้าหลักในคลังให้มีความถูกต้องและปลอดภัยสูงสุด'
        },
        {
          type: 'list',
          heading: '👑 Admin (ผู้ดูแลระบบสูงสุด)',
          text: '1. อนุมัติ/ปฏิเสธ/ลบ ใบเสนอราคาของพนักงานทุกคนในระบบ\n2. จัดการข้อมูลพนักงาน ปรับเปลี่ยนระดับสิทธิ์ และรีเซ็ตรหัสผ่านให้แก่ทีมงานทั้งหมด\n3. ติดตามความเคลื่อนไหวผ่าน Activity Logs และล้างล็อกเพื่อลดภาระฐานข้อมูล\n4. มีสิทธิ์ลบสินค้า แบรนด์ และหมวดหมู่หลักในฐานข้อมูลอย่างถาวร'
        },
        {
          type: 'list',
          heading: '💼 Manager (ผู้จัดการคลังสินค้า)',
          text: '1. เพิ่มสินค้าใหม่ในคลัง หรือนำเข้าสินค้าคราวละมาก ๆ ผ่านปุ่ม Excel\n2. ปรับแต่งราคาสินค้าทีละหลาย ๆ รายการพร้อมกัน (Bulk Price Update)\n3. ควบคุมและบริหารรายชื่อแบรนด์และหมวดหมู่หลักในระบบ\n4. เพิ่มบัญชีพนักงานใหม่ระดับ User หรือช่วยรีเซ็ตรหัสผ่านให้ทีมพนักงานทั่วไป'
        },
        {
          type: 'list',
          heading: '👤 User (พนักงานทั่วไป/ทีมงานขาย)',
          text: '1. ค้นหาสินค้า ดึงบาร์โค้ด และส่งภาพสินค้าหลักเพื่อช่วยในการขาย\n2. สร้างเอกสารใบเสนอราคาให้ลูกค้า\n3. คัดลอกลิงก์ส่งให้ลูกค้ากดอนุมัติออนไลน์ หรือให้ Admin ช่วยกดอนุมัติในระบบ\n4. พิมพ์หรือดาวน์โหลดใบเสนอราคา A4 คมชัดหลังจากเอกสารได้รับสถานะ Approved แล้ว'
        }
      ]
    });

    // 2. Dashboard (All Roles)
    sections.push({
      id: 'dashboard',
      title: 'การใช้งาน Dashboard',
      icon: Grid,
      keywords: 'แผงควบคุม สถิติ สรุป รายการ แจ้งเตือน ระฆัง แดชบอร์ด dashboard',
      allowedRoles: ['admin', 'manager', 'user'],
      subSections: [
        {
          type: 'paragraph',
          heading: 'การใช้งาน Dashboard',
          text: 'แผงควบคุมสถิติ (Dashboard) แสดงสถานะและสรุปข้อมูลสำคัญในระบบ'
        },
        {
          type: 'list',
          heading: 'การดูการ์ดสรุปยอดคงเหลือ',
          text: 'ช่วยตรวจสอบจำนวนสินค้าทั้งหมด แบรนด์ และหมวดหมู่ที่เปิดใช้งานในระบบ ณ ปัจจุบัน'
        },
        ...(userRole === 'admin' ? [{
          type: 'list',
          heading: 'แถบการแจ้งเตือนล็อกการทำงาน',
          text: 'ไอคอนกระดิ่งสั่นเมื่อมีสมาชิกทำการแก้ไขสินค้าหรือใบเสนอราคา ช่วยให้ผู้ดูแลระบบตรวจสอบความเคลื่อนไหวได้เรียลไทม์'
        }] : [])
      ]
    });

    // 3. Products
    sections.push({
      id: 'products',
      title: 'คู่มือการจัดการสินค้า',
      icon: Package,
      keywords: 'จัดการสินค้า สินค้า ค้นหา เพิ่มสินค้า นำเข้า excel shopee tiktok bulk update อัปเดตกลุ่ม',
      allowedRoles: ['admin', 'manager', 'user'],
      subSections: [
        {
          type: 'paragraph',
          heading: 'คู่มือการจัดการสินค้า',
          text: 'คู่มือการสืบค้น ค้นหา และวิเคราะห์ข้อมูลรายการสินค้าคงคลังในฐานข้อมูล'
        },
        {
          type: 'list',
          heading: 'การค้นหาและกรองข้อมูลสินค้า',
          text: 'พิมพ์ค้นหาได้ทันทีจากช่องค้นหาด้วย รหัสสินค้า, ชื่อสินค้า หรือบาร์โค้ด และใช้ตัวเลือกเพื่อกรองสินค้าตามหมวดหมู่หรือแบรนด์'
        },
        ...(userRole === 'admin' || userRole === 'manager' ? [
          {
            type: 'list',
            heading: 'การเพิ่มและแก้ไขสินค้า',
            text: 'กดปุ่ม "เพิ่มสินค้าใหม่" ระบุรายละเอียดรหัส ชื่อ ขนาด น้ำหนัก ราคา และอัปโหลดภาพประกอบ'
          },
          {
            type: 'list',
            heading: 'การนำเข้าผ่านไฟล์ Excel (Shopee / TikTok Shop)',
            text: 'สามารถนำเข้าข้อมูลสินค้าจำนวนมากผ่าน Excel โดยระบบมีตัวแปลงไฟล์รองรับเทมเพลตมาตรฐาน PIM, Shopee Export และ TikTok Shop Export'
          },
          {
            type: 'list',
            heading: 'การอัปเดตราคาแบบกลุ่ม (Bulk Update)',
            text: 'เลือกสินค้าที่ต้องการ จากนั้นกดปุ่ม "ปรับปรุงราคา" เพื่อทำการคำนวณปรับเพิ่ม/ลดราคาสินค้าเป็นจำนวนเงินหรือเป็นเปอร์เซ็นต์พร้อมกัน'
          }
        ] : [
          {
            type: 'warning',
            heading: 'ข้อจำกัดสิทธิ์ระดับ User',
            text: 'สิทธิ์การใช้งานของคุณเป็น พนักงานขาย (User) ระบบจะไม่แสดงตัวเลือก เพิ่มสินค้า, นำเข้าไฟล์ Excel, ลบสินค้า หรือ ปรับปรุงราคาเป็นกลุ่ม ปุ่มเหล่านี้จะถูกซ่อนไว้เพื่อป้องกันการเปลี่ยนแปลงข้อมูลหลักโดยไม่ได้ตั้งใจ สิทธิ์ของคุณทำได้เฉพาะการดู ค้นหาข้อมูลสินค้า ดึงบาร์โค้ด และตรวจสอบราคาเท่านั้น'
          }
        ])
      ]
    });

    // 4. Brands & Categories (Only Admin & Manager)
    if (userRole === 'admin' || userRole === 'manager') {
      sections.push({
        id: 'brands-cats',
        title: 'คู่มือแบรนด์และหมวดหมู่',
        icon: Award,
        keywords: 'จัดการแบรนด์ แบรนด์ จัดการหมวดหมู่ หมวดหมู่ คอลเลกชัน เชื่อมโยง อัปเดตอัตโนมัติ',
        allowedRoles: ['admin', 'manager'],
        subSections: [
          {
            type: 'paragraph',
            heading: 'คู่มือแบรนด์และหมวดหมู่',
            text: 'คู่มือสำหรับ Manager และ Admin ในการควบคุมชื่อแบรนด์สินค้าและประเภทหมวดหมู่'
          },
          {
            type: 'list',
            heading: 'การอัปเดตชื่อสอดคล้องกัน (Cascade Update)',
            text: 'หากคุณแก้ไขชื่อแบรนด์หรือหมวดหมู่สินค้าในหน้านี้ ระบบจะทำการแก้ไขข้อมูลของสินค้าทุกชิ้นในระบบที่สังกัดแบรนด์หรือหมวดหมูันั้นๆ ให้อัปเดตตามโดยอัตโนมัติ'
          },
          ...(userRole === 'admin' ? [{
            type: 'list',
            heading: 'สิทธิ์การลบแบรนด์/หมวดหมู่',
            text: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถสั่งลบแบรนด์สินค้าหรือหมวดหมู่สินค้าออกจากระบบได้'
          }] : [])
        ]
      });
    }

    // 5. Quotations (All Roles)
    sections.push({
      id: 'quotations',
      title: 'คู่มือการออกใบเสนอราคา',
      icon: FileText,
      keywords: 'ใบเสนอราคา เสนอราคา เสนอสินค้า พิมพ์ พีดีเอฟ pdf ปริ้น print ส่งอีเมล mailto ลิงก์สาธารณะ online share',
      allowedRoles: ['admin', 'manager', 'user'],
      subSections: [
        {
          type: 'paragraph',
          heading: 'คู่มือการออกใบเสนอราคา',
          text: 'การสร้าง จัดการ และออกเอกสารใบเสนอราคาสำหรับลูกค้า'
        },
        {
          type: 'list',
          heading: 'การกรอกชื่อลูกค้าเก่าอัตโนมัติ (Auto-Complete)',
          text: 'เมื่อเริ่มพิมพ์ตัวอักษรในช่องลูกค้า จะมีตัวเลือกจากรายชื่อที่เคยพิมพ์ใบเสนอราคาไปแล้วให้กดเลือก ระบบจะป้อนที่อยู่และเลขประจำตัวผู้เสียภาษีให้อัตโนมัติ'
        },
        {
          type: 'list',
          heading: 'สัดส่วนการพิมพ์ A4 มาตรฐาน (Auto-Pagination)',
          text: 'ระบบจะวัดขนาดความสูงของตารางและรูปสินค้าเพื่อเว้นแบ่งหน้ากระดาษ A4 ให้อัตโนมัติ โดยส่วนผลรวมและลายเซ็นต์จะอยู่ด้านล่างหน้าสุดท้ายเสมอ'
        },
        {
          type: 'list',
          heading: 'ลิงก์ดูใบเสนอราคาออนไลน์และกดยอมรับ',
          text: 'พนักงานสามารถคัดลอกลิงก์แชร์ออนไลน์ให้ลูกค้ากดยอมรับ ซึ่งจะเปลี่ยนสถานะในระบบเป็นอนุมัติให้อัตโนมัติ'
        },
        ...(userRole === 'admin' ? [{
          type: 'list',
          heading: 'สิทธิ์การอนุมัติและจัดการสถานะ (Admin)',
          text: 'ในฐานะ Admin คุณสามารถอนุมัติ ปฏิเสธ หรือลบประวัติใบเสนอราคาที่ออกโดยพนักงานทุกคนได้'
        }] : [{
          type: 'warning',
          heading: 'ความจำเป็นในการอนุมัติใบเสนอราคา',
          text: 'ใบเสนอราคาที่พนักงานทั่วไป (User) หรือผู้จัดการ (Manager) สร้างขึ้น จะต้องมีสถานะเป็น อนุมัติแล้ว (Approved) เท่านั้นจึงจะสามารถกดดาวน์โหลด PDF หรือพิมพ์ส่งจริงได้ (กรุณาให้ผู้ดูแลระบบ Admin ทำการอนุมัติในโปรแกรม หรือใช้ระบบกดยอมรับผ่านหน้าลิงก์ออนไลน์ของลูกค้าเพื่อปลดล็อก)'
        }])
      ]
    });

    // 6. Users & Logs (Admin & Manager)
    if (userRole === 'admin' || userRole === 'manager') {
      sections.push({
        id: 'users-logs',
        title: userRole === 'admin' ? 'ผู้ใช้งานและล็อกระบบ (Admin Only)' : 'คู่มือการจัดการผู้ใช้งาน',
        icon: Users,
        keywords: 'สิทธิ์ บทบาท แอดมิน ผู้จัดการ ทั่วไป admin manager user ล็อก ประวัติ ล้างล็อก activity log จัดการผู้ใช้งาน',
        allowedRoles: ['admin', 'manager'],
        subSections: [
          {
            type: 'paragraph',
            heading: 'คู่มือในการจัดการบัญชีและความปลอดภัย',
            text: 'คู่มือในการจัดการบัญชีผู้ใช้และบันทึกความปลอดภัยของระบบ'
          },
          {
            type: 'list',
            heading: 'การจัดการรายชื่อพนักงาน',
            text: userRole === 'admin' 
              ? 'คุณสามารถเพิ่มพนักงานใหม่ แก้ไขบทบาทสิทธิ์ (Admin / Manager / User) และรีเซ็ตรหัสผ่านพนักงานได้ทุกคน'
              : 'คุณสามารถเพิ่มพนักงานทั่วไป (User) และช่วยแก้ไขชื่อหรือรีเซ็ตรหัสผ่านของพนักงานทั่วไปได้ (แต่ไม่สามารถแก้ไขสิทธิ์ของ Admin หรือ Manager คนอื่นได้)'
          },
          ...(userRole === 'admin' ? [{
            type: 'list',
            heading: 'การตรวจสอบล็อกประวัติการทำงาน (Activity Logs)',
            text: 'ติดตามความถูกต้องผ่านตารางประวัติกิจกรรม เพื่อดูว่าพนักงานคนไหนแก้ไข ลบ หรือเพิ่มสิ่งใดบ้าง รวมถึงมีเครื่องมือลบประวัติเพื่อล้างพื้นที่เมื่อประวัติมีจำนวนเยอะเกินไป'
          }] : [])
        ]
      });
    }

    return sections;
  }, [userRole]);

  // Utility to escape RegExp characters
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // React highlighting helper
  const highlightText = (text, searchStr) => {
    if (!text) return '';
    if (!searchStr || !searchStr.trim()) return text;
    
    const query = searchStr.trim();
    try {
      const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
      const parts = text.split(regex);
      return (
        <span>
          {parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase()
              ? <mark key={i} className="bg-amber-100 text-amber-900 font-bold px-0.5 rounded border-b border-amber-300">{part}</mark>
              : part
          )}
        </span>
      );
    } catch {
      return text;
    }
  };

  // Perform highly precise full-text search across sections
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    const results = [];

    manualSections.forEach(section => {
      // Check section fields
      const sectionTitleMatched = section.title.toLowerCase().includes(query);
      const sectionKeywordsMatched = section.keywords.toLowerCase().includes(query);

      section.subSections.forEach(sub => {
        const headingMatched = sub.heading.toLowerCase().includes(query);
        const textMatched = sub.text.toLowerCase().includes(query);

        if (sectionTitleMatched || sectionKeywordsMatched || headingMatched || textMatched) {
          results.push({
            sectionId: section.id,
            sectionTitle: section.title,
            heading: sub.heading,
            text: sub.text,
            type: sub.type,
            icon: section.icon
          });
        }
      });
    });

    return results;
  }, [searchQuery, manualSections]);

  const activeContent = useMemo(() => {
    const found = manualSections.find(s => s.id === activeSection);
    return found ? found : manualSections[0];
  }, [activeSection, manualSections]);

  // Main rendering logic for content
  const renderMainPane = () => {
    if (searchQuery.trim() !== '') {
      return (
        <div className="space-y-4 bg-white p-6 sm:p-8 overflow-y-auto flex-1">
          <div className="border-b border-[#e8e8ed] pb-3 mb-4 shrink-0">
            <h1 className="text-base font-extrabold text-[#1d1d1f] tracking-tight">
              ผลการค้นหาสำหรับ "{searchQuery}"
            </h1>
            <p className="text-[10px] text-[#555557] font-semibold mt-0.5">พบทั้งหมด {searchResults.length} รายการที่ตรงกัน</p>
          </div>
          
          {searchResults.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 space-y-2">
              <Search className="w-8 h-8 mx-auto stroke-1 text-zinc-300 animate-pulse" />
              <p className="text-xs font-bold">ไม่พบข้อมูลหรือคู่มือที่ระบุ</p>
              <p className="text-[10px]">โปรดลองค้นหาด้วยคำอื่น เช่น "Excel", "ใบเสนอราคา", "สิทธิ์", "PDF"</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {searchResults.map((res, i) => {
                const ResIcon = res.icon;
                return (
                  <div 
                    key={i}
                    onClick={() => {
                      setActiveSection(res.sectionId);
                      setSearchQuery(''); // Jump to section and reset search to view full details
                    }}
                    className="p-4 rounded-2xl border border-zinc-200 hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer bg-white group"
                  >
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600 uppercase tracking-wide">
                      <ResIcon className="w-3.5 h-3.5" />
                      <span>{res.sectionTitle}</span>
                      <ChevronRight className="w-3 h-3 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <h3 className="text-xs font-bold text-[#1d1d1f] mt-1.5">{highlightText(res.heading, searchQuery)}</h3>
                    <p className="text-[11px] text-[#555557] mt-1 leading-relaxed font-semibold">
                      {highlightText(res.text, searchQuery)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Standard view of selected tab
    return (
      <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-white">
        {/* Mobile Navigation List if on small screen */}
        <div className="sm:hidden mb-6 border-b border-[#e8e8ed] pb-4">
          <label className="text-[10px] font-bold text-[#8e8e93] block mb-2 uppercase tracking-wide">หัวข้อหลัก</label>
          <select
            value={activeSection}
            onChange={e => setActiveSection(e.target.value)}
            className="w-full text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/50 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#0071e3]"
          >
            {manualSections.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {/* Display Active Topic Content */}
        <div className="space-y-5 max-w-2xl animate-fade-in">
          <div className="flex items-center gap-2 border-b border-[#e8e8ed] pb-3 mb-2">
            <activeContent.icon className="w-5 h-5 text-[#0071e3]" />
            <h1 className="text-base font-extrabold text-[#1d1d1f] tracking-tight">{activeContent.title}</h1>
          </div>
          
          <div className="space-y-4">
            {activeContent.subSections.map((sub, i) => {
              if (sub.type === 'info') {
                return (
                  <div key={i} className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-800">
                    <BookOpen className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
                    <div className="text-[13.5px] sm:text-[14px] leading-relaxed font-medium">
                      {highlightText(sub.text, searchQuery)}
                    </div>
                  </div>
                );
              }
              if (sub.type === 'warning') {
                return (
                  <div key={i} className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-800">
                    <X className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                    <div className="text-[13.5px] sm:text-[14px] leading-relaxed font-medium">
                      {highlightText(sub.text, searchQuery)}
                    </div>
                  </div>
                );
              }
              if (sub.type === 'list') {
                return (
                  <div key={i} className="border-l-2 border-blue-500 pl-3 py-0.5">
                    <strong className="text-[#1d1d1f] text-[13.5px] sm:text-[14px] font-bold block mb-0.5">{highlightText(sub.heading, searchQuery)}</strong>
                    <p className="text-[#555557] text-[12.5px] sm:text-[13px] leading-relaxed font-medium">
                      {highlightText(sub.text, searchQuery)}
                    </p>
                  </div>
                );
              }
              return (
                <div key={i} className="space-y-1">
                  <h3 className="text-[13.5px] sm:text-[14px] font-bold text-[#1d1d1f]">{highlightText(sub.heading, searchQuery)}</h3>
                  <p className="text-[12.5px] sm:text-[13px] text-[#555557] leading-relaxed font-medium">
                    {highlightText(sub.text, searchQuery)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-fade-in" />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl border border-[#d2d2d7]/50 max-w-4xl w-full h-[80vh] shadow-2xl z-10 flex flex-col overflow-hidden text-[#1d1d1f] animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-[#1d1d1f] tracking-tight">คู่มือการใช้งานระบบ PIM-SYSTEM</h2>
              <p className="text-[10px] text-[#555557] font-semibold">ขั้นตอนและคู่มือแยกสิทธิ์การใช้งานสำหรับพนักงาน บริษัท พันธ์วาดี จำกัด</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="ค้นหาคู่มือ..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs text-[#1d1d1f] bg-[#f5f5f7] border border-[#d2d2d7]/60 rounded-full focus:outline-none focus:border-[#0071e3] focus:bg-white transition-all font-semibold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 p-2 rounded-full hover:bg-[#f5f5f7] transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Workspace Panels */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Panel Sidebar */}
          <div className="w-64 border-r border-[#e8e8ed] bg-zinc-50/50 p-3 overflow-y-auto space-y-1 shrink-0 hidden sm:block">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8e8e93] px-3.5 py-2 block">หมวดหมู่คู่มือ</span>
            {manualSections.length === 0 ? (
              <p className="text-[10px] text-zinc-400 text-center py-6 font-semibold">ไม่พบผลการค้นหา</p>
            ) : manualSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id && searchQuery.trim() === '';
              return (
                <button
                  type="button"
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setSearchQuery(''); // Switch tab and clear search
                  }}
                  className={`
                    w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-between group
                    ${isActive 
                      ? 'bg-[#0071e3]/10 text-[#0071e3]' 
                      : 'text-zinc-650 hover:bg-zinc-100 hover:text-black'
                    }
                  `}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0071e3]' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
                    <span>{section.title}</span>
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'translate-x-0.5 text-[#0071e3]' : 'opacity-0 group-hover:opacity-100 text-zinc-400'}`} />
                </button>
              );
            })}
          </div>

          {/* Right Panel Main Content */}
          {renderMainPane()}

        </div>

      </div>
    </div>
  );
}
