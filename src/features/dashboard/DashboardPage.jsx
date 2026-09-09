import { useAuth } from '../auth/AuthContext.jsx'

const cards = [
  { label: 'مواعيد اليوم', value: '12', detail: '+3 منذ الأمس', trend: 'up', icon: '◷' },
  { label: 'مرضى بانتظارك', value: '08', detail: '2 وصلوا حديثًا', trend: 'neutral', icon: '♙' },
  { label: 'إجمالي المرضى', value: '1,284', detail: '+24 هذا الشهر', trend: 'up', icon: '◉' },
  { label: 'إيرادات اليوم', value: '8,450 ج.م', detail: '-2.4% عن الأمس', trend: 'down', icon: '↗' },
]

const appointments = [
  { time: '09:00 ص', patient: 'أحمد محمود', doctor: 'د. سارة علي', status: 'مؤكد', tone: 'confirmed' },
  { time: '10:30 ص', patient: 'منى خالد', doctor: 'د. سارة علي', status: 'قيد الانتظار', tone: 'waiting' },
  { time: '11:15 ص', patient: 'يوسف عادل', doctor: 'د. عمر حسن', status: 'مؤكد', tone: 'confirmed' },
  { time: '12:00 م', patient: 'ليلى محمد', doctor: 'د. نور أحمد', status: 'مكتمل', tone: 'completed' },
]

const quickActions = [
  { icon: '♙', title: 'تسجيل مريض', subtitle: 'إضافة ملف مريض جديد', accent: 'primary' },
  { icon: '◷', title: 'حجز موعد', subtitle: 'إنشاء موعد جديد', accent: 'green' },
  { icon: '▤', title: 'فتح سجل طبي', subtitle: 'تحديث حالة المريض', accent: 'blue' },
]

export function DashboardPage() {
  const { profile } = useAuth()
  const greetingName = profile?.displayName?.split(' ')[0] || 'بك'

  return (
    <div className="dashboard-page">
      <div className="page-title">
        <div>
          <p className="eyebrow">نظرة عامة</p>
          <h1>صباح الخير، {greetingName} 👋</h1>
          <p>إليك ملخص نشاط العيادة اليوم، الأحد ١ سبتمبر.</p>
        </div>

        <button type="button" className="primary-button">
          + حجز موعد جديد
        </button>
      </div>

      <section className="stat-grid" aria-label="إحصاءات العيادة">
        {cards.map((card) => (
          <article key={card.label} className="stat-card">
            <div className="stat-card-top">
              <span className="stat-icon">{card.icon}</span>
              <span className={`trend-badge ${card.trend}`}>
                {card.trend === 'up' ? '↗' : card.trend === 'down' ? '↘' : '→'}
              </span>
            </div>

            <p>{card.label}</p>
            <h2>{card.value}</h2>
            <small className={card.trend === 'down' ? 'trend-down' : card.trend === 'up' ? 'trend-up' : 'trend-neutral'}>
              {card.detail}
            </small>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel table-panel">
          <div className="panel-heading">
            <div>
              <h2>مواعيد اليوم</h2>
              <p>الأحد، ١ سبتمبر ٢٠٢٦</p>
            </div>
            <button type="button" className="text-button">
              عرض الكل ←
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>المريض</th>
                  <th>الطبيب</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((row) => (
                  <tr key={`${row.time}-${row.patient}`}>
                    <td>{row.time}</td>
                    <td>{row.patient}</td>
                    <td>{row.doctor}</td>
                    <td>
                      <span className={`status-badge ${row.tone}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="panel actions-panel">
          <div className="panel-heading">
            <div>
              <h2>إجراءات سريعة</h2>
              <p>مهام شائعة</p>
            </div>
          </div>

          <div className="quick-actions">
            {quickActions.map((action) => (
              <button type="button" key={action.title} className={`quick-action-card ${action.accent}`}>
                <span className="quick-action-icon" aria-hidden="true">{action.icon}</span>
                <span className="quick-action-copy">
                  <strong>{action.title}</strong>
                  <small>{action.subtitle}</small>
                </span>
                <span className="quick-action-arrow">←</span>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}

