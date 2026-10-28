import {
  Bell,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleSlash2,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FilePlus2,
  Files,
  GraduationCap,
  Home,
  Info,
  LogOut,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { FormEvent, Fragment, useEffect, useRef, useState } from "react"
import logoDra from "./imports/image.png"

type RoleKey = "area" | "director" | "consulta"

type MenuItem = {
  label: string
  icon: LucideIcon
  count?: number
}

type Notice = {
  text: string
  time: string
  icon: LucideIcon
  tone: "orange" | "green" | "neutral" | "red"
  read?: boolean
}

type Summary = {
  label: string
  value: number
  unit: string
  icon: LucideIcon
  tone: "amber" | "orange" | "green" | "neutral"
  featured?: boolean
  action?: boolean
}

type RoleConfig = {
  user: string
  firstName: string
  initials: string
  role: string
  menu: MenuItem[]
  summaries: Summary[]
  notices: Notice[]
}

const roleConfigs: Record<RoleKey, RoleConfig> = {
  area: {
    user: "Rosa Quispe Huamán",
    firstName: "Rosa",
    initials: "RQ",
    role: "Área encargada – Área de Capacitación",
    menu: [
      { label: "Inicio", icon: Home },
      { label: "Mis documentos", icon: Files },
      { label: "Nuevo documento", icon: FilePlus2 },
    ],
    summaries: [
      {
        label: "Pendientes de firma",
        value: 3,
        unit: "envíos en revisión",
        icon: Clock3,
        tone: "amber",
      },
      {
        label: "Observados",
        value: 1,
        unit: "envíos por corregir",
        icon: CircleAlert,
        tone: "orange",
        featured: true,
      },
      {
        label: "Firmados este mes",
        value: 12,
        unit: "certificados emitidos",
        icon: CheckCircle2,
        tone: "green",
      },
    ],
    notices: [
      {
        text: "El certificado DRA-2026-K7M4PX fue observado por el Director",
        time: "hace 10 min",
        icon: CircleAlert,
        tone: "orange",
      },
      {
        text: "El certificado DRA-2026-B9T3QW fue firmado",
        time: "hace 1 h",
        icon: CheckCircle2,
        tone: "green",
      },
      {
        text: "El certificado DRA-2026-H5R8NZ fue firmado",
        time: "hace 3 h",
        icon: CheckCircle2,
        tone: "green",
      },
    ],
  },
  director: {
    user: "Ing. Carlos Mendoza Rivera",
    firstName: "Carlos",
    initials: "CM",
    role: "Director de la Agencia Agraria Satipo",
    menu: [
      { label: "Inicio", icon: Home },
      { label: "Por revisar", icon: Clock3, count: 5 },
      { label: "Documentos firmados", icon: FileCheck2 },
    ],
    summaries: [
      {
        label: "Por revisar",
        value: 5,
        unit: "envíos por revisar",
        icon: Clock3,
        tone: "amber",
        featured: true,
        action: true,
      },
      {
        label: "Firmados esta semana",
        value: 8,
        unit: "certificados firmados",
        icon: CheckCircle2,
        tone: "green",
      },
      {
        label: "Observados esta semana",
        value: 1,
        unit: "envíos observados",
        icon: CircleAlert,
        tone: "orange",
      },
    ],
    notices: [
      {
        text: "Nuevo documento pendiente: Certificado de Capacitación – Juan Ccori Pari",
        time: "hace 10 min",
        icon: Files,
        tone: "neutral",
      },
      {
        text: "Nuevo documento pendiente: Certificado de Capacitación – María Elena Rojas Soto",
        time: "hace 1 h",
        icon: Files,
        tone: "neutral",
      },
      {
        text: "Nuevo documento pendiente: Certificado de Trabajo – Pedro Huaman Inga",
        time: "hace 3 h",
        icon: Files,
        tone: "neutral",
      },
    ],
  },
  consulta: {
    user: "Luis Torres Paredes",
    firstName: "Luis",
    initials: "LT",
    role: "Consulta interna – Mesa de Partes",
    menu: [
      { label: "Inicio", icon: Home },
      { label: "Buscar documentos", icon: Search },
    ],
    summaries: [
      {
        label: "Listos para entregar",
        value: 4,
        unit: "envíos por imprimir",
        icon: PackageCheck,
        tone: "green",
        featured: true,
      },
      {
        label: "Impresos esta semana",
        value: 9,
        unit: "certificados impresos",
        icon: CheckCircle2,
        tone: "green",
      },
      {
        label: "Duplicados emitidos",
        value: 1,
        unit: "certificados reimpresos",
        icon: Files,
        tone: "neutral",
      },
    ],
    notices: [
      {
        text: "Certificado DRA-2026-B9T3QW listo para entrega física",
        time: "hace 10 min",
        icon: PackageCheck,
        tone: "green",
      },
      {
        text: "Certificado DRA-2026-H5R8NZ listo para entrega física",
        time: "hace 1 h",
        icon: PackageCheck,
        tone: "green",
      },
      {
        text: "Constancia DRA-2026-W4E6YJ lista para entrega física",
        time: "hace 3 h",
        icon: PackageCheck,
        tone: "green",
      },
    ],
  },
}

type DocumentStatus =
  | "Pendiente"
  | "Observado"
  | "Rechazado"
  | "Firmado"
  | "Anulado"
type DocumentFilter =
  | "Todos"
  | "Pendientes"
  | "Observados"
  | "Firmados"
  | "Rechazados"
type AreaPage =
  | "home"
  | "documents"
  | "new"
  | "issue"
  | "preview"
  | "detail"
  | "correct-individual"
  | "correct-lot"
  | "reissue"

type AreaDocument = {
  code: string
  type: string
  beneficiary: string
  date: string
  status: DocumentStatus
  batch?: boolean
}

type Beneficiary = {
  id: number
  names: string
  surnames: string
  dni: string
}

type EventData = {
  name: string
  startDate: string
  endDate: string
  duration: string
  place: string
  area: string
}

function quantityText(
  value: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${value} ${value === 1 ? singular : plural}`
}

function unitForValue(unit: string, value: number) {
  if (value !== 1) return unit
  return unit
    .replace("envíos", "envío")
    .replace("certificados", "certificado")
}

const initialDocuments: AreaDocument[] = [
  {
    code: "Lote 2026-007",
    type: "Certificado de Capacitación",
    beneficiary: "Manejo integrado de plagas en café – 8 beneficiarios",
    date: "07/10/2026",
    status: "Pendiente",
    batch: true,
  },
  {
    code: "Lote 2026-006",
    type: "Certificado de Capacitación",
    beneficiary: "Buenas prácticas de cosecha de cacao – 12 beneficiarios",
    date: "02/10/2026",
    status: "Firmado",
    batch: true,
  },
  {
    code: "DRA-2026-K7M4PX",
    type: "Certificado de Capacitación",
    beneficiary: "Juan Ccori Pari",
    date: "01/10/2026",
    status: "Observado",
  },
  {
    code: "DRA-2026-P3W8TR",
    type: "Certificado de Reconocimiento",
    beneficiary: "María Elena Rojas Soto",
    date: "30/09/2026",
    status: "Pendiente",
  },
  {
    code: "DRA-2026-H5R8NZ",
    type: "Certificado de Capacitación",
    beneficiary: "Pedro Huaman Inga",
    date: "25/09/2026",
    status: "Firmado",
  },
]

const importedBeneficiaries: Beneficiary[] = [
  { id: 1, names: "Juan", surnames: "Ccori Pari", dni: "45218736" },
  { id: 2, names: "María Elena", surnames: "Rojas Soto", dni: "47390125" },
  { id: 3, names: "Pedro", surnames: "Huaman Inga", dni: "43876512" },
  {
    id: 4,
    names: "Rosa Luz",
    surnames: "Chuquimantari Pérez",
    dni: "46021987",
  },
  { id: 5, names: "Wilber", surnames: "Quispe Casancho", dni: "4419823" },
  { id: 6, names: "Nelly", surnames: "Mayta Huarcaya", dni: "48132760" },
  {
    id: 7,
    names: "Edison",
    surnames: "Shimpukat Kinchokre",
    dni: "44567201",
  },
  {
    id: 8,
    names: "Gladys",
    surnames: "Sanchez Ñaupari",
    dni: "45903318",
  },
]

const initialEventData: EventData = {
  name: "Manejo integrado de plagas en café",
  startDate: "2026-09-14",
  endDate: "2026-09-16",
  duration: "24 horas",
  place: "Local comunal de Río Negro, Satipo",
  area: "Área de Capacitación",
}

type DirectorItem = {
  id: string
  code: string
  type: string
  beneficiary: string
  area: string
  submittedBy: string
  submittedDate: string
  reviewed: boolean
  reviewedAt?: string
  dni?: string
  expediente?: string
  lotCode?: string
  corrected?: boolean
  reissue?: {
    originalCode: string
    reason: string
    changes: string[]
  }
  observedReturned?: number
  history?: WorkflowHistory[]
  originalCode?: string
  replacedBy?: string
  annulledAt?: string
  annulmentReason?: string
  annulmentRecord?: string
  certificateTitle: "CERTIFICADO" | "CONSTANCIA"
  certificateText?: string
  beneficiaries?: Beneficiary[]
  event?: EventData
}

type SignedDocument = {
  code: string
  type: string
  beneficiary: string
  area: string
  signedDate: string
  batch?: boolean
  session?: boolean
}

type StoredNotice = {
  id: string
  text: string
  time: string
  tone: "orange" | "green" | "neutral" | "red"
  icon: "alert" | "check" | "file" | "package" | "reject"
  read: boolean
  targetCode?: string
}

type PrintRecord = {
  at: string
  duplicate: boolean
}

type RegistryDocument = {
  code: string
  type: string
  beneficiary: string
  dni: string
  area: string
  registeredBy: string
  registeredAt: string
  submittedAt: string
  reviewedAt: string
  signedAt: string
  deliveryStatus: "ready" | "printed" | "annulled"
  prints: PrintRecord[]
  lotCode?: string
  workshop?: string
  eventStart?: string
  eventEnd?: string
  duration?: string
  place?: string
  certificateTitle: "CERTIFICADO" | "CONSTANCIA"
  certificateText: string
  expediente?: string
  history?: WorkflowHistory[]
}

type WorkflowHistory = {
  at: string
  text: string
}

type CaseRecord = {
  code: string
  type: string
  beneficiary: string
  names: string
  surnames: string
  dni: string
  area: string
  submittedBy: string
  submittedDate: string
  status: DocumentStatus
  certificateTitle: "CERTIFICADO" | "CONSTANCIA"
  certificateText: string
  expediente?: string
  lotCode?: string
  event?: EventData
  beneficiaries?: Beneficiary[]
  reason?: string
  actionAt?: string
  history: WorkflowHistory[]
  reissue?: DirectorItem["reissue"]
}

type SessionMetrics = {
  areaPending: number
  areaObserved: number
  areaSigned: number
  directorSigned: number
  directorObserved: number
  consultationReady: number
  consultationPrinted: number
  consultationDuplicates: number
}

type SharedState = {
  documents: AreaDocument[]
  queue: DirectorItem[]
  signed: SignedDocument[]
  notifications: Record<RoleKey, StoredNotice[]>
  registry: RegistryDocument[]
  metrics: SessionMetrics
  cases: CaseRecord[]
  luciaFailedOnce: boolean
}

const individualItems: DirectorItem[] = [
  {
    id: "DRA-2026-T6N9QE",
    code: "DRA-2026-T6N9QE",
    type: "Constancia de Productor Activo",
    beneficiary: "Teodoro Inga Mamani",
    area: "Área de Desarrollo Agrario",
    submittedBy: "Marco Salazar Vela",
    submittedDate: "28/09/2026",
    reviewed: false,
    dni: "44731958",
    expediente: "EXP-2026-004817",
    certificateTitle: "CONSTANCIA",
    certificateText:
      "Por encontrarse registrado como productor activo en el ámbito de la Agencia Agraria Satipo, dedicado al cultivo de café en el sector Alto Pichanaki.",
  },
  {
    id: "DRA-2026-P3W8TR",
    code: "DRA-2026-P3W8TR",
    type: "Certificado de Reconocimiento",
    beneficiary: "María Elena Rojas Soto",
    area: "Área de Capacitación",
    submittedBy: "Rosa Quispe Huamán",
    submittedDate: "30/09/2026",
    reviewed: false,
    dni: "47390125",
    history: [
      {
        at: "2026-09-30T09:15:00",
        text: "Registrado por Rosa Quispe Huamán (Área de Capacitación)",
      },
      { at: "2026-09-30T09:40:00", text: "Enviado a revisión" },
    ],
    certificateTitle: "CERTIFICADO",
    certificateText:
      "En reconocimiento a su destacada labor como promotora agraria en la difusión de buenas prácticas de cultivo de cacao en las comunidades de Satipo durante el año 2026.",
  },
  {
    id: "DRA-2026-V3J7XC",
    code: "DRA-2026-V3J7XC",
    type: "Certificado de Prácticas",
    beneficiary: "Kevin Ramos Ccanto",
    area: "Área de Administración",
    submittedBy: "Silvia Poma Torres",
    submittedDate: "03/10/2026",
    reviewed: false,
    dni: "46385127",
    expediente: "EXP-2026-005263",
    certificateTitle: "CERTIFICADO",
    certificateText:
      "Por haber realizado sus prácticas preprofesionales en el Área de Administración de la Agencia Agraria Satipo, del 01/06/2026 al 31/08/2026, demostrando responsabilidad y compromiso.",
  },
  {
    id: "DRA-2026-F8R2MA",
    code: "DRA-2026-F8R2MA",
    type: "Certificado de Trabajo",
    beneficiary: "Lucía Paredes Quinto",
    area: "Área de Administración",
    submittedBy: "Silvia Poma Torres",
    submittedDate: "05/10/2026",
    reviewed: false,
    dni: "45829364",
    expediente: "EXP-2026-005391",
    certificateTitle: "CERTIFICADO",
    certificateText:
      "Por haber laborado en la Agencia Agraria Satipo como asistente administrativa, del 02/01/2025 al 30/09/2026, demostrando responsabilidad y buen desempeño.",
  },
]

const initialQueue: DirectorItem[] = [
  ...individualItems,
  {
    id: "Lote 2026-007",
    code: "Lote 2026-007",
    type: "Certificado de Capacitación",
    beneficiary:
      "Lote 2026-007 – Manejo integrado de plagas en café – 8 certificados",
    area: "Área de Capacitación",
    submittedBy: "Rosa Quispe Huamán",
    submittedDate: "07/10/2026",
    reviewed: false,
    certificateTitle: "CERTIFICADO",
    beneficiaries: importedBeneficiaries.map((beneficiary) => ({
      ...beneficiary,
      dni: beneficiary.id === 5 ? "44198236" : beneficiary.dni,
    })),
    event: initialEventData,
  },
]

const initialSigned: SignedDocument[] = [
  {
    code: "Lote 2026-006",
    type: "Certificado de Capacitación",
    beneficiary: "Buenas prácticas de cosecha de cacao – 12 certificados",
    area: "Área de Capacitación",
    signedDate: "02/10/2026",
    batch: true,
  },
  {
    code: "DRA-2026-H5R8NZ",
    type: "Certificado de Capacitación",
    beneficiary: "Pedro Huaman Inga",
    area: "Área de Capacitación",
    signedDate: "25/09/2026",
  },
]

const lot006People = [
  ["Hilario Cusi Ramos", "44872315", "DRA-2026-A3K7MV"],
  ["Celia Torres Ancco", "46230978", "DRA-2026-B6T2WQ"],
  ["Fermín Rivas Chávez", "43518264", "DRA-2026-C9R4XH"],
  ["Yolanda Mendoza Pari", "47652139", "DRA-2026-D2M8NY"],
  ["Abel Quintana Soto", "45387620", "DRA-2026-F7Q3ZK"],
  ["Marleni Huachaca Rojas", "48127356", "DRA-2026-H4W9TC"],
  ["Ruth Campos Inga", "44906273", "DRA-2026-K8C5RB"],
  ["Saúl Antezana Pérez", "46819542", "DRA-2026-M2A6PX"],
  ["Delia Shapiama Coronado", "45273891", "DRA-2026-N5S3VE"],
  ["Julio Yupanqui Cerrón", "43765128", "DRA-2026-Q9Y7DG"],
  ["Elmer Chiricente Sánchez", "47318625", "DRA-2026-T3E8WJ"],
  ["Norma Baldeón Quispe", "46592437", "DRA-2026-V6N2HU"],
]

const lot006Registry: RegistryDocument[] = lot006People.map(
  ([beneficiary, dni, code]) => ({
    code,
    type: "Certificado de Capacitación",
    beneficiary,
    dni,
    area: "Área de Capacitación",
    registeredBy: "Rosa Quispe Huamán",
    registeredAt: "2026-09-25T08:35:00",
    submittedAt: "2026-09-25T09:10:00",
    reviewedAt: "2026-10-02T09:55:00",
    signedAt: "2026-10-02T10:15:00",
    deliveryStatus: "printed",
    prints: [{ at: "2026-10-05T09:40:00", duplicate: false }],
    lotCode: "Lote 2026-006",
    workshop: "Buenas prácticas de cosecha de cacao",
    eventStart: "2026-09-22",
    eventEnd: "2026-09-24",
    duration: "24 horas",
    place: "Local comunal de Pampa Hermosa, Satipo",
    certificateTitle: "CERTIFICADO",
    certificateText: `Por haber participado en el taller de capacitación 'Buenas prácticas de cosecha de cacao', realizado del 22 al 24 de setiembre de 2026 en el Local comunal de Pampa Hermosa, Satipo, con una duración de 24 horas.`,
  }),
)

const initialReadyRegistry: RegistryDocument[] = [
  {
    code: "DRA-2026-H5R8NZ",
    type: "Certificado de Capacitación",
    beneficiary: "Pedro Huaman Inga",
    dni: "43876512",
    area: "Área de Capacitación",
    registeredBy: "Rosa Quispe Huamán",
    signedAt: "2026-09-25T11:20:00",
    workshop: "Buenas prácticas de cosecha de cacao",
    eventStart: "2026-09-22",
    eventEnd: "2026-09-24",
    duration: "24 horas",
    place: "Local comunal de Pampa Hermosa, Satipo",
    certificateTitle: "CERTIFICADO",
    certificateText:
      "Por haber participado en el taller de capacitación 'Buenas prácticas de cosecha de cacao', realizado del 22 al 24 de setiembre de 2026 en el Local comunal de Pampa Hermosa, Satipo, con una duración de 24 horas.",
  },
  {
    code: "DRA-2026-B9T3QW",
    type: "Certificado de Capacitación",
    beneficiary: "Lourdes Ccanto Mallma",
    dni: "45620873",
    area: "Área de Capacitación",
    registeredBy: "Rosa Quispe Huamán",
    signedAt: "2026-10-06T10:30:00",
    certificateTitle: "CERTIFICADO",
    certificateText:
      "Por haber participado satisfactoriamente en las actividades de capacitación organizadas por la Agencia Agraria Satipo.",
  },
  {
    code: "DRA-2026-W4E6YJ",
    type: "Constancia de Productor Activo",
    beneficiary: "Gregorio Pomahuali Torres",
    dni: "44153798",
    area: "Área de Desarrollo Agrario",
    registeredBy: "Marco Salazar Vela",
    expediente: "EXP-2026-004652",
    signedAt: "2026-10-06T15:10:00",
    certificateTitle: "CONSTANCIA",
    certificateText:
      "Por encontrarse registrado como productor activo en el ámbito de la Agencia Agraria Satipo.",
  },
  {
    code: "DRA-2026-Z8K3RD",
    type: "Certificado de Trabajo",
    beneficiary: "Silvana Arroyo Meza",
    dni: "47208631",
    area: "Área de Administración",
    registeredBy: "Silvia Poma Torres",
    expediente: "EXP-2026-005108",
    signedAt: "2026-10-05T12:25:00",
    certificateTitle: "CERTIFICADO",
    certificateText:
      "Por haber laborado en la Agencia Agraria Satipo, demostrando responsabilidad y buen desempeño.",
  },
].map((document) => {
  const signed = new Date(document.signedAt)
  return {
    ...document,
    registeredAt:
      document.code === "DRA-2026-H5R8NZ"
        ? "2026-09-25T08:30:00"
        : new Date(signed.getTime() - 86400000 * 2).toISOString(),
    submittedAt:
      document.code === "DRA-2026-H5R8NZ"
        ? "2026-09-25T09:00:00"
        : new Date(signed.getTime() - 86400000).toISOString(),
    reviewedAt:
      document.code === "DRA-2026-H5R8NZ"
        ? "2026-09-25T10:20:00"
        : new Date(signed.getTime() - 3600000).toISOString(),
    deliveryStatus: "ready" as const,
    prints: [],
  }
})

const emptyMetrics: SessionMetrics = {
  areaPending: 0,
  areaObserved: 0,
  areaSigned: 0,
  directorSigned: 0,
  directorObserved: 0,
  consultationReady: 0,
  consultationPrinted: 0,
  consultationDuplicates: 0,
}

const initialCases: CaseRecord[] = [
  {
    code: "DRA-2026-K7M4PX",
    type: "Certificado de Capacitación",
    beneficiary: "Juan Ccori Pari",
    names: "Juan",
    surnames: "Ccori Pari",
    dni: "45218736",
    area: "Área de Capacitación",
    submittedBy: "Rosa Quispe Huamán",
    submittedDate: "01/10/2026",
    status: "Observado",
    certificateTitle: "CERTIFICADO",
    certificateText:
      "Por haber participado en el taller de capacitación 'Buenas prácticas de cosecha de cacao', realizado del 22 al 24 de setiembre de 2026 en el Local comunal de Pampa Hermosa, Satipo, con una duración de 24 horas.",
    event: {
      name: "Buenas prácticas de cosecha de cacao",
      startDate: "2026-09-22",
      endDate: "2026-09-24",
      duration: "24 horas",
      place: "Local comunal de Pampa Hermosa, Satipo",
      area: "Área de Capacitación",
    },
    reason: "El nombre no coincide con el registrado en el DNI",
    actionAt: "2026-10-01T16:20:00",
    history: [
      {
        at: "2026-10-01T09:10:00",
        text: "Registrado por Rosa Quispe Huamán (Área de Capacitación)",
      },
      { at: "2026-10-01T09:25:00", text: "Enviado a revisión" },
      {
        at: "2026-10-01T16:20:00",
        text: "Observado por Ing. Carlos Mendoza Rivera – Motivo: El nombre no coincide con el registrado en el DNI",
      },
    ],
  },
]

function makeInitialNotifications(): Record<RoleKey, StoredNotice[]> {
  return {
    area: roleConfigs.area.notices.map((notice, index) => ({
      id: `area-${index}`,
      text: notice.text,
      time: notice.time,
      tone: notice.tone,
      icon: index === 0 ? "alert" : "check",
      read: false,
      targetCode: ["DRA-2026-K7M4PX", "DRA-2026-B9T3QW", "DRA-2026-H5R8NZ"][
        index
      ],
    })),
    director: [
      {
        id: "director-0",
        text: "Nuevo documento pendiente: Lote 2026-007 – Manejo integrado de plagas en café (8 certificados)",
        targetCode: "Lote 2026-007",
      },
      {
        id: "director-1",
        text: "Nuevo documento pendiente: Certificado de Trabajo – Lucía Paredes Quinto",
        targetCode: "DRA-2026-F8R2MA",
      },
      {
        id: "director-2",
        text: "Nuevo documento pendiente: Certificado de Prácticas – Kevin Ramos Ccanto",
        targetCode: "DRA-2026-V3J7XC",
      },
    ].map((notice, index) => ({
      ...notice,
      time: ["hace 10 min", "hace 1 h", "hace 3 h"][index],
      tone: "neutral" as const,
      icon: "file" as const,
      read: false,
    })),
    consulta: roleConfigs.consulta.notices.map((notice, index) => ({
      id: `consulta-${index}`,
      text: notice.text,
      time: notice.time,
      tone: notice.tone,
      icon: "package",
      read: false,
      targetCode: ["DRA-2026-B9T3QW", "DRA-2026-H5R8NZ", "DRA-2026-W4E6YJ"][
        index
      ],
    })),
  }
}

const initialSharedState: SharedState = {
  documents: initialDocuments,
  queue: initialQueue,
  signed: initialSigned,
  notifications: makeInitialNotifications(),
  registry: [...lot006Registry, ...initialReadyRegistry],
  metrics: emptyMetrics,
  cases: initialCases,
  luciaFailedOnce: false,
}

function normalizeStoredNotifications(
  notifications: Record<RoleKey, StoredNotice[]> | undefined,
) {
  const source = notifications ?? initialSharedState.notifications
  const addTargets = (items: StoredNotice[]) =>
    items.map((notice) => ({
      ...notice,
      text: notice.text.replace(
        "María Rojas Soto",
        "María Elena Rojas Soto",
      ),
      targetCode:
        notice.targetCode ??
        notice.text.match(/Lote 2026-\d{3}|DRA-2026-[A-Z0-9]{6}/)?.[0],
    }))
  return {
    area: addTargets(source.area),
    director: source.director.some((notice) => notice.targetCode)
      ? addTargets(source.director)
      : initialSharedState.notifications.director,
    consulta: addTargets(source.consulta),
  }
}

function normalizeQueue(items: DirectorItem[] | undefined) {
  return (items ?? initialQueue).map((item) => {
    const initial = individualItems.find(
      (candidate) => candidate.code === item.code,
    )
    const requiredHistory =
      item.code === "DRA-2026-P3W8TR" ? initial?.history ?? [] : []
    return {
      ...initial,
      ...item,
      ...canonicalQueueData(item.code),
      dni: canonicalDni(item.code, item.dni),
      beneficiary: canonicalBeneficiary(item.code, item.beneficiary),
      history: [
        ...requiredHistory,
        ...(item.history ?? []).filter(
          (event) =>
            !requiredHistory.some(
              (required) =>
                required.at === event.at && required.text === event.text,
            ),
        ),
      ],
    }
  })
}

function normalizeRegistry(
  items: RegistryDocument[] | undefined,
  luciaFailedOnce = false,
) {
  return (items ?? initialSharedState.registry).map((item) => ({
    ...initialReadyRegistry.find((initial) => initial.code === item.code),
    ...item,
    ...canonicalRegistryData(item.code),
    dni: canonicalDni(item.code, item.dni),
    beneficiary: canonicalBeneficiary(item.code, item.beneficiary),
    history:
      item.code === "DRA-2026-F8R2MA" &&
      luciaFailedOnce &&
      !item.history?.some((event) =>
        event.text.startsWith("Error al preparar el documento"),
      )
        ? [
            ...(item.history ?? []),
            {
              at: item.reviewedAt,
              text: "Error al preparar el documento – devuelto a Por revisar",
            },
          ]
        : item.history,
  }))
}

function canonicalRegistryData(code: string): Partial<RegistryDocument> {
  if (code === "DRA-2026-P3W8TR") {
    return {
      beneficiary: "María Elena Rojas Soto",
      dni: "47390125",
      area: "Área de Capacitación",
      registeredBy: "Rosa Quispe Huamán",
      registeredAt: "2026-09-30T09:15:00",
      submittedAt: "2026-09-30T09:40:00",
    }
  }
  if (
    code !== "DRA-2026-H5R8NZ" &&
    code !== "DRA-2026-U7H3KW"
  )
    return {}
  const reissue = code === "DRA-2026-U7H3KW"
  return {
    dni: "43876512",
    beneficiary: reissue ? "Pedro Huamán Inga" : "Pedro Huaman Inga",
    area: "Área de Capacitación",
    registeredBy: "Rosa Quispe Huamán",
    ...(reissue
      ? {}
      : {
          registeredAt: "2026-09-25T08:30:00",
          submittedAt: "2026-09-25T09:00:00",
          reviewedAt: "2026-09-25T10:20:00",
          signedAt: "2026-09-25T11:20:00",
        }),
    workshop: "Buenas prácticas de cosecha de cacao",
    eventStart: "2026-09-22",
    eventEnd: "2026-09-24",
    duration: "24 horas",
    place: "Local comunal de Pampa Hermosa, Satipo",
    certificateText:
      "Por haber participado en el taller de capacitación 'Buenas prácticas de cosecha de cacao', realizado del 22 al 24 de setiembre de 2026 en el Local comunal de Pampa Hermosa, Satipo, con una duración de 24 horas.",
    originalCode: reissue ? "DRA-2026-H5R8NZ" : undefined,
  }
}

function canonicalQueueData(code: string): Partial<DirectorItem> {
  if (code !== "DRA-2026-U7H3KW") return {}
  return {
    beneficiary: "Pedro Huamán Inga",
    dni: "43876512",
    area: "Área de Capacitación",
    event: {
      name: "Buenas prácticas de cosecha de cacao",
      startDate: "2026-09-22",
      endDate: "2026-09-24",
      duration: "24 horas",
      place: "Local comunal de Pampa Hermosa, Satipo",
      area: "Área de Capacitación",
    },
    certificateText:
      "Por haber participado en el taller de capacitación 'Buenas prácticas de cosecha de cacao', realizado del 22 al 24 de setiembre de 2026 en el Local comunal de Pampa Hermosa, Satipo, con una duración de 24 horas.",
  }
}

function normalizeCases(items: CaseRecord[] | undefined) {
  return (items ?? initialSharedState.cases).map((item) => ({
    ...item,
    dni: canonicalDni(item.code, item.dni),
    beneficiary: canonicalBeneficiary(item.code, item.beneficiary),
  }))
}

function normalizeDocuments(items: AreaDocument[] | undefined) {
  return (items ?? initialDocuments).map((item) => ({
    ...item,
    beneficiary: canonicalBeneficiary(item.code, item.beneficiary),
  }))
}

function canonicalDni(code: string, current?: string) {
  const values: Record<string, string> = {
    "DRA-2026-T6N9QE": "44731958",
    "DRA-2026-V3J7XC": "46385127",
    "DRA-2026-F8R2MA": "45829364",
  }
  return values[code] ?? current ?? ""
}

function canonicalBeneficiary(code: string, current: string) {
  if (code === "DRA-2026-P3W8TR") return "María Elena Rojas Soto"
  if (code === "DRA-2026-U7H3KW") return "Pedro Huamán Inga"
  return current
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "warning"
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

function useSharedState() {
  const [shared, setShared] = useState<SharedState>(() => {
    const stored = sessionStorage.getItem("aas-shared-documents")
    if (!stored) return initialSharedState
    try {
      const parsed = JSON.parse(stored) as Partial<SharedState>
      return {
        ...initialSharedState,
        ...parsed,
        documents: normalizeDocuments(parsed.documents),
        queue: normalizeQueue(parsed.queue),
        registry: normalizeRegistry(
          parsed.registry,
          parsed.luciaFailedOnce ?? false,
        ),
        metrics: { ...emptyMetrics, ...parsed.metrics },
        cases: normalizeCases(parsed.cases),
        luciaFailedOnce: parsed.luciaFailedOnce ?? false,
        notifications: normalizeStoredNotifications(parsed.notifications),
      }
    } catch {
      return initialSharedState
    }
  })

  useEffect(() => {
    sessionStorage.setItem(
      "aas-shared-documents",
      JSON.stringify({
        ...initialSharedState,
        ...shared,
        documents: normalizeDocuments(shared.documents),
        queue: normalizeQueue(shared.queue),
        registry: normalizeRegistry(
          shared.registry,
          shared.luciaFailedOnce ?? false,
        ),
        metrics: { ...emptyMetrics, ...shared.metrics },
        cases: normalizeCases(shared.cases),
        luciaFailedOnce: shared.luciaFailedOnce ?? false,
        notifications: normalizeStoredNotifications(shared.notifications),
      }),
    )
  }, [shared])

  return [
    {
      ...initialSharedState,
      ...shared,
      documents: normalizeDocuments(shared.documents),
      queue: normalizeQueue(shared.queue),
      registry: normalizeRegistry(
        shared.registry,
        shared.luciaFailedOnce ?? false,
      ),
      metrics: { ...emptyMetrics, ...shared.metrics },
      cases: normalizeCases(shared.cases),
      luciaFailedOnce: shared.luciaFailedOnce ?? false,
      notifications: normalizeStoredNotifications(shared.notifications),
    },
    setShared,
  ] as const
}

function LoginScreen({ onLogin }: { onLogin: (role: RoleKey) => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState(false)

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const rolesByUsername: Record<string, RoleKey> = {
      rquispe: "area",
      cmendoza: "director",
      ltorres: "consulta",
    }
    const matchedRole = rolesByUsername[username]

    if (matchedRole && password === "Demo2026") {
      setLoginError(false)
      onLogin(matchedRole)
      return
    }

    setLoginError(true)
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <img className="login-logo" src={logoDra} alt="Logo de la DRA Junín" />
        <div className="login-heading">
          <h1 id="login-title">Plataforma de Certificados y Constancias</h1>
          <p>Agencia Agraria Satipo – DRA Junín</p>
        </div>

        <form className="login-form" onSubmit={submitLogin} autoComplete="off">
          <label>
            <span>Usuario</span>
            <input
              name="usuario"
              placeholder="Ingrese su usuario"
              autoComplete="off"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            <span>Contraseña</span>
            <span className="password-field">
              <input
                name="contrasena"
                type={showPassword ? "text" : "password"}
                placeholder="Ingrese su contraseña"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </label>
          {loginError ? (
            <div className="login-error" role="alert">
              <CircleAlert />
              <span>Usuario o contraseña incorrectos</span>
            </div>
          ) : null}
          <Button className="full-width" type="submit">
            Ingresar
          </Button>
        </form>
      </section>
    </main>
  )
}

function Sidebar({
  config,
  activeItem,
  onNavigate,
}: {
  config: RoleConfig
  activeItem: string
  onNavigate: (label: string) => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={logoDra} alt="Logo de la DRA Junín" />
        <span>Agencia Agraria Satipo</span>
      </div>
      <nav aria-label="Navegación principal">
        {config.menu.map((item) => {
          const Icon = item.icon
          const active = item.label === activeItem
          return (
            <button
              className={`nav-item${active ? " nav-item-active" : ""}`}
              type="button"
              key={item.label}
              onClick={() => onNavigate(item.label)}
              aria-current={active ? "page" : undefined}
            >
              <Icon />
              <span>{item.label}</span>
              {item.count ? (
                <span className="menu-count">{item.count}</span>
              ) : null}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

function Notifications({
  notices,
  open,
  unreadCount,
  onToggle,
  onReadAll,
  onNoticeClick,
}: {
  notices: Notice[]
  open: boolean
  unreadCount: number
  onToggle: () => void
  onReadAll: () => void
  onNoticeClick: (index: number) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (open && !panelRef.current?.contains(event.target as Node)) {
        onToggle()
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick)
    return () => document.removeEventListener("mousedown", closeOnOutsideClick)
  }, [open, onToggle])

  return (
    <div className="notification-wrap" ref={panelRef}>
      <button
        className="icon-button"
        type="button"
        onClick={onToggle}
        aria-label="Abrir notificaciones"
        aria-expanded={open}
      >
        <Bell />
        {unreadCount ? (
          <span className="notification-count">{unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <section className="notification-panel" aria-label="Notificaciones">
          <div className="notification-title">
            <h2>Notificaciones</h2>
          </div>
          <div className="notification-list">
            {notices.map((notice, index) => {
              const Icon = notice.icon
              return (
                <button
                  className="notice"
                  type="button"
                  key={`${notice.text}-${index}`}
                  onClick={() => onNoticeClick(index)}
                >
                  <span className={`notice-icon notice-${notice.tone}`}>
                    <Icon />
                  </span>
                  <span className="notice-copy">
                    <span>{notice.text}</span>
                    <small>{notice.time}</small>
                  </span>
                  {!notice.read ? <span className="unread-dot" /> : null}
                </button>
              )
            })}
          </div>
          <button className="read-all" type="button" onClick={onReadAll}>
            Marcar todas como leídas
          </button>
        </section>
      ) : null}
    </div>
  )
}

function Header({
  config,
  title,
  noticesOpen,
  unreadCount,
  onToggleNotices,
  onReadAll,
  onNoticeClick,
  onLogout,
}: {
  config: RoleConfig
  title: string
  noticesOpen: boolean
  unreadCount: number
  onToggleNotices: () => void
  onReadAll: () => void
  onNoticeClick: (index: number) => void
  onLogout: () => void
}) {
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="topbar-actions">
        <Notifications
          notices={config.notices}
          open={noticesOpen}
          unreadCount={unreadCount}
          onToggle={onToggleNotices}
          onReadAll={onReadAll}
          onNoticeClick={onNoticeClick}
        />
        <div className="profile" aria-label={`${config.user}, ${config.role}`}>
          <span className="avatar">{config.initials}</span>
          <span className="profile-copy">
            <strong>{config.user}</strong>
            <span>{config.role}</span>
          </span>
        </div>
        <Button
          variant="secondary"
          className="logout-button"
          onClick={onLogout}
        >
          <LogOut />
          Cerrar sesión
        </Button>
      </div>
    </header>
  )
}

function SummaryCard({
  summary,
  onReview,
}: {
  summary: Summary
  onReview: () => void
}) {
  const Icon = summary.icon
  return (
    <article
      className={`summary-card tone-${summary.tone}${
        summary.featured ? " summary-featured" : ""
      }`}
    >
      <div className="summary-top">
        <span className="summary-label">{summary.label}</span>
        <span className="summary-icon">
          <Icon />
        </span>
      </div>
      <strong className="summary-value">{summary.value}</strong>
      <span className="summary-unit">
        {unitForValue(summary.unit, summary.value)}
      </span>
      {summary.action ? (
        <Button className="review-button" onClick={onReview}>
          Revisar ahora
          <ChevronRight />
        </Button>
      ) : null}
    </article>
  )
}

function HomeContent({
  config,
  onReview,
}: {
  config: RoleConfig
  onReview: () => void
}) {
  return (
    <div className="content-inner">
      <div className="welcome">
        <p>Buenos días, {config.firstName}</p>
      </div>
      <section className="summary-grid" aria-label="Resumen">
        {config.summaries.map((summary) => (
          <SummaryCard
            key={summary.label}
            summary={summary}
            onReview={onReview}
          />
        ))}
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const icons: Record<DocumentStatus, LucideIcon> = {
    Pendiente: Clock3,
    Observado: CircleAlert,
    Rechazado: XCircle,
    Firmado: CheckCircle2,
    Anulado: CircleSlash2,
  }
  const Icon = icons[status]

  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <Icon />
      {status}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="area-empty-state">
      <span className="empty-illustration" aria-hidden="true">
        <Files />
        <Search />
      </span>
      <p>{text}</p>
    </div>
  )
}

function DocumentsContent({
  documents,
  filter,
  onFilter,
  onNew,
  onOpen,
  annulledByLot,
}: {
  documents: AreaDocument[]
  filter: DocumentFilter
  onFilter: (filter: DocumentFilter) => void
  onNew: () => void
  onOpen: (document: AreaDocument) => void
  annulledByLot: Record<string, number>
}) {
  const filters: DocumentFilter[] = [
    "Todos",
    "Pendientes",
    "Observados",
    "Firmados",
    "Rechazados",
  ]
  const filteredDocuments =
    filter === "Todos"
      ? documents
      : documents.filter((document) => `${document.status}s` === filter)

  return (
    <div className="content-inner area-content">
      <div className="content-actions">
        <span />
        <Button onClick={onNew}>
          <FilePlus2 />
          Nuevo documento
        </Button>
      </div>
      <div className="document-tabs" role="tablist" aria-label="Estados">
        {filters.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={filter === item}
            className={filter === item ? "document-tab active" : "document-tab"}
            key={item}
            onClick={() => onFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <section className="table-card">
        {filteredDocuments.length ? (
          <div className="table-scroll">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>Código o lote</th>
                  <th>Tipo</th>
                  <th>Beneficiario(s)</th>
                  <th>Fecha de envío</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr
                    className="clickable-document-row"
                    key={document.code}
                    onClick={() => onOpen(document)}
                  >
                    <td>
                      <span className="document-code">
                        {document.batch ? <Users /> : null}
                        {document.code}
                      </span>
                    </td>
                    <td>{document.type}</td>
                    <td>{document.beneficiary}</td>
                    <td>{document.date}</td>
                    <td>
                      <StatusBadge status={document.status} />
                      {document.batch &&
                      document.status === "Firmado" &&
                      annulledByLot[document.code] ? (
                        <span className="document-annulled-note">
                          {quantityText(
                            annulledByLot[document.code],
                            "anulado",
                          )}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No hay documentos en esta categoría." />
        )}
      </section>
    </div>
  )
}

function NewDocumentContent({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="content-inner area-content">
      <p className="page-intro">
        Seleccione el tipo de documento que desea emitir
      </p>
      <div className="document-type-grid">
        <button className="document-type-card" type="button" onClick={onSelect}>
          <span className="type-icon">
            <GraduationCap />
          </span>
          <strong>Certificado de Capacitación</strong>
          <span>
            Para participantes de talleres y capacitaciones. Emisión por lista.
          </span>
          <ChevronRight className="type-arrow" />
        </button>
        <div className="document-type-card type-disabled">
          <span className="type-icon">
            <Award />
          </span>
          <strong>Certificado de Reconocimiento</strong>
          <span>
            Para reconocimientos institucionales. Emisión por lista.
          </span>
          <span className="coming-soon">Disponible próximamente</span>
        </div>
      </div>
      <p className="area-note">
        Solo se muestran los tipos de documento asignados a su área.
      </p>
    </div>
  )
}

function Steps({
  preview = false,
  hasBeneficiaries = false,
}: {
  preview?: boolean
  hasBeneficiaries?: boolean
}) {
  const steps = [
    { number: 1, label: "Datos del evento" },
    { number: 2, label: "Beneficiarios" },
    { number: 3, label: "Vista previa" },
  ]

  return (
    <div className="steps" aria-label="Progreso">
      {steps.map((step, index) => {
        const complete = preview && step.number < 3
        const active = preview
          ? step.number === 3
          : step.number === 1 || (step.number === 2 && hasBeneficiaries)
        return (
          <div className="step-wrap" key={step.number}>
            <div
              className={`step${active ? " active" : ""}${
                complete ? " complete" : ""
              }`}
            >
              <span>{complete ? <Check /> : step.number}</span>
              <strong>{step.label}</strong>
            </div>
            {index < steps.length - 1 ? <span className="step-line" /> : null}
          </div>
        )
      })}
    </div>
  )
}

function EventFields({
  data,
  onChange,
}: {
  data: EventData
  onChange: (key: keyof EventData, value: string) => void
}) {
  return (
    <section className="workflow-card">
      <h2>Datos del evento</h2>
      <div className="event-fields">
        <label className="field-wide">
          <span>Nombre del taller</span>
          <input
            value={data.name}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </label>
        <label>
          <span>Fecha de inicio</span>
          <input
            type="date"
            value={data.startDate}
            onChange={(event) => onChange("startDate", event.target.value)}
          />
        </label>
        <label>
          <span>Fecha de fin</span>
          <input
            type="date"
            value={data.endDate}
            onChange={(event) => onChange("endDate", event.target.value)}
          />
        </label>
        <label>
          <span>Duración</span>
          <input
            value={data.duration}
            onChange={(event) => onChange("duration", event.target.value)}
          />
        </label>
        <label className="field-wide">
          <span>Lugar</span>
          <input
            value={data.place}
            onChange={(event) => onChange("place", event.target.value)}
          />
        </label>
        <label>
          <span>Área organizadora</span>
          <input
            value={data.area}
            onChange={(event) => onChange("area", event.target.value)}
          />
        </label>
      </div>
    </section>
  )
}

function beneficiaryErrors(beneficiary: Beneficiary) {
  return {
    names: beneficiary.names.trim() ? "" : "Campo obligatorio",
    surnames: beneficiary.surnames.trim() ? "" : "Campo obligatorio",
    dni: /^\d{8}$/.test(beneficiary.dni)
      ? ""
      : "El DNI debe tener 8 dígitos",
  }
}

function BeneficiariesCard({
  beneficiaries,
  onImport,
  onAdd,
  onUpdate,
  onDelete,
  onDownload,
}: {
  beneficiaries: Beneficiary[]
  onImport: () => void
  onAdd: () => void
  onUpdate: (id: number, key: keyof Beneficiary, value: string) => void
  onDelete: (id: number) => void
  onDownload: () => void
}) {
  const errorCount = beneficiaries.reduce((total, beneficiary) => {
    const errors = beneficiaryErrors(beneficiary)
    return total + Object.values(errors).filter(Boolean).length
  }, 0)

  return (
    <section className="workflow-card">
      <div className="beneficiary-heading">
        <h2>Beneficiarios</h2>
        <div className="beneficiary-actions">
          <Button variant="secondary" onClick={onDownload}>
            <Download />
            Descargar plantilla Excel
          </Button>
          <Button variant="secondary" onClick={onImport}>
            <Upload />
            Importar desde Excel
          </Button>
          <Button variant="secondary" onClick={onAdd}>
            <UserPlus />
            Agregar beneficiario
          </Button>
        </div>
      </div>
      {!beneficiaries.length ? (
        <EmptyState text="Aún no hay beneficiarios. Importe la lista desde Excel o agréguelos uno por uno." />
      ) : (
        <>
          <div
            className={`validation-notice ${
              errorCount ? "validation-error" : "validation-success"
            }`}
          >
            {errorCount ? <CircleAlert /> : <CheckCircle2 />}
            <span>
              {errorCount
                ? `Hay ${errorCount} ${
                    errorCount === 1 ? "error" : "errores"
                  } en la lista. ${
                    errorCount === 1 ? "Corríjalo" : "Corríjalos"
                  } para continuar.`
                : `${quantityText(
                    beneficiaries.length,
                    "beneficiario",
                  )} ${beneficiaries.length === 1 ? "listo" : "listos"}`}
            </span>
          </div>
          <div className="table-scroll">
            <table className="beneficiaries-table">
              <thead>
                <tr>
                  <th>N.°</th>
                  <th>Nombres</th>
                  <th>Apellidos</th>
                  <th>DNI</th>
                  <th aria-label="Acción" />
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((beneficiary, index) => {
                  const errors = beneficiaryErrors(beneficiary)
                  const hasError = Object.values(errors).some(Boolean)
                  return (
                    <tr className={hasError ? "row-error" : ""} key={beneficiary.id}>
                      <td>{index + 1}</td>
                      {(["names", "surnames", "dni"] as const).map((key) => (
                        <td key={key}>
                          <input
                            value={beneficiary[key]}
                            inputMode={key === "dni" ? "numeric" : undefined}
                            onChange={(event) =>
                              onUpdate(beneficiary.id, key, event.target.value)
                            }
                          />
                          {errors[key] ? (
                            <span className="field-error">{errors[key]}</span>
                          ) : null}
                        </td>
                      ))}
                      <td>
                        <button
                          className="delete-row"
                          type="button"
                          aria-label={`Eliminar beneficiario ${index + 1}`}
                          onClick={() => onDelete(beneficiary.id)}
                        >
                          <Trash2 />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function IssueContent({
  eventData,
  beneficiaries,
  onEventChange,
  onBeneficiariesChange,
  onContinue,
  onToast,
}: {
  eventData: EventData
  beneficiaries: Beneficiary[]
  onEventChange: (key: keyof EventData, value: string) => void
  onBeneficiariesChange: (beneficiaries: Beneficiary[]) => void
  onContinue: () => void
  onToast: (message: string) => void
}) {
  const errorCount = beneficiaries.reduce((total, beneficiary) => {
    const errors = beneficiaryErrors(beneficiary)
    return total + Object.values(errors).filter(Boolean).length
  }, 0)

  function updateBeneficiary(
    id: number,
    key: keyof Beneficiary,
    value: string,
  ) {
    onBeneficiariesChange(
      beneficiaries.map((beneficiary) =>
        beneficiary.id === id ? { ...beneficiary, [key]: value } : beneficiary,
      ),
    )
  }

  function addBeneficiary() {
    const nextId =
      beneficiaries.reduce(
        (highest, beneficiary) => Math.max(highest, beneficiary.id),
        0,
      ) + 1
    onBeneficiariesChange([
      ...beneficiaries,
      { id: nextId, names: "", surnames: "", dni: "" },
    ])
  }

  return (
    <div className="content-inner area-content workflow-content">
      <span className="origin-chip">Origen: De oficio</span>
      <Steps hasBeneficiaries={beneficiaries.length > 0} />
      <EventFields data={eventData} onChange={onEventChange} />
      <BeneficiariesCard
        beneficiaries={beneficiaries}
        onImport={() =>
          onBeneficiariesChange(importedBeneficiaries.map((item) => ({ ...item })))
        }
        onAdd={addBeneficiary}
        onUpdate={updateBeneficiary}
        onDelete={(id) =>
          onBeneficiariesChange(
            beneficiaries.filter((beneficiary) => beneficiary.id !== id),
          )
        }
        onDownload={() => onToast("Plantilla descargada")}
      />
      <div className="workflow-footer">
        <Button
          disabled={!beneficiaries.length || errorCount > 0}
          onClick={onContinue}
        >
          Continuar a vista previa
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split("-")
  return `${day}/${month}/${year}`
}

function formatCertificateDateRange(startDate: string, endDate: string) {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "setiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ]
  const [startYear, startMonth, startDay] = startDate.split("-")
  const [endYear, endMonth, endDay] = endDate.split("-")
  if (startYear === endYear && startMonth === endMonth) {
    return `${Number(startDay)} al ${Number(endDay)} de ${
      months[Number(startMonth) - 1]
    } de ${startYear}`
  }
  return `${Number(startDay)} de ${
    months[Number(startMonth) - 1]
  } de ${startYear} al ${Number(endDay)} de ${
    months[Number(endMonth) - 1]
  } de ${endYear}`
}

const lot007Codes: Record<string, string> = {
  "Juan Ccori Pari": "DRA-2026-J4C7QX",
  "María Elena Rojas Soto": "DRA-2026-M8R3TW",
  "Pedro Huaman Inga": "DRA-2026-P6H2NK",
  "Rosa Luz Chuquimantari Pérez": "DRA-2026-R9C5VB",
  "Wilber Quispe Casancho": "DRA-2026-W3Q8ZD",
  "Nelly Mayta Huarcaya": "DRA-2026-N7M4HF",
  "Edison Shimpukat Kinchokre": "DRA-2026-E2S6KR",
  "Gladys Sanchez Ñaupari": "DRA-2026-G5S9PT",
}

function generatedDocumentCode(seed: string) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let value = 2166136261
  for (const character of seed) {
    value ^= character.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  let suffix = ""
  for (let index = 0; index < 6; index += 1) {
    value = Math.imul(value ^ (value >>> 13), 1274126177)
    suffix += alphabet[Math.abs(value) % alphabet.length]
  }
  return `DRA-2026-${suffix}`
}

function registryDocumentsFromItem(item: DirectorItem, signedAt: string) {
  const registeredHistory = item.history?.find((event) =>
    event.text.startsWith("Registrado por"),
  )
  const submittedHistory = item.history?.find(
    (event) => event.text === "Enviado a revisión",
  )
  const registeredAt =
    item.code === "Lote 2026-007"
      ? "2026-10-07T08:40:00"
      : registeredHistory?.at ??
        isoFromDisplayDate(item.submittedDate, "08:30")
  const submittedAt =
    item.code === "Lote 2026-007"
      ? "2026-10-07T08:52:00"
      : submittedHistory?.at ??
        isoFromDisplayDate(item.submittedDate, "08:45")
  if (item.beneficiaries?.length) {
    const event = item.event ?? initialEventData
    return item.beneficiaries.map((beneficiary) => {
      const fullName = `${beneficiary.names} ${beneficiary.surnames}`
      return {
        code:
          item.code === "Lote 2026-007"
            ? lot007Codes[fullName]
            : generatedDocumentCode(`${item.code}-${fullName}`),
        type: item.type,
        beneficiary: fullName,
        dni: beneficiary.dni,
        area: item.area,
        registeredBy: item.submittedBy,
        registeredAt,
        submittedAt,
        reviewedAt: item.reviewedAt ?? signedAt,
        signedAt,
        deliveryStatus: "ready" as const,
        prints: [],
        lotCode: item.code,
        workshop: event.name,
        eventStart: event.startDate,
        eventEnd: event.endDate,
        duration: event.duration,
        place: event.place,
        certificateTitle: "CERTIFICADO" as const,
        certificateText: `Por haber participado en el taller de capacitación '${event.name}', realizado del ${formatCertificateDateRange(event.startDate, event.endDate)} en el ${event.place}, con una duración de ${event.duration}.`,
        history: item.history,
      }
    })
  }
  return [
    {
      code: item.code,
      type: item.type,
      beneficiary: item.beneficiary,
      dni: item.dni ?? "00000000",
      area: item.area,
      registeredBy: item.submittedBy,
      registeredAt,
      submittedAt,
      reviewedAt: item.reviewedAt ?? signedAt,
      signedAt,
      deliveryStatus: "ready" as const,
      prints: [],
      certificateTitle: item.certificateTitle,
      certificateText: item.certificateText ?? "",
      expediente: item.expediente,
      lotCode: item.lotCode,
      originalCode: item.reissue?.originalCode,
      history: item.reissue
        ? [
            ...(item.history ?? []),
            {
              at: signedAt,
              text: `Reemplaza a ${item.reissue.originalCode}`,
            },
          ]
        : item.history,
    },
  ]
}

function QrIllustration() {
  const cells = [
    [9, 1],
    [11, 1],
    [8, 3],
    [10, 4],
    [12, 3],
    [8, 6],
    [10, 7],
    [12, 6],
    [1, 9],
    [3, 8],
    [5, 10],
    [7, 9],
    [9, 9],
    [11, 8],
    [13, 10],
    [8, 12],
    [10, 11],
    [12, 13],
    [14, 12],
    [5, 13],
  ]
  return (
    <svg
      className="qr-illustration"
      viewBox="0 0 16 16"
      aria-label="Código QR ilustrativo"
    >
      <rect width="16" height="16" fill="white" />
      {[
        [0.5, 0.5],
        [10.5, 0.5],
        [0.5, 10.5],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="5" height="5" fill="black" />
          <rect x={x + 1} y={y + 1} width="3" height="3" fill="white" />
          <rect x={x + 2} y={y + 2} width="1" height="1" fill="black" />
        </g>
      ))}
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="black" />
      ))}
    </svg>
  )
}

function CertificatePreview({
  title,
  name,
  text,
  finalDocument,
  dni,
}: {
  title: "CERTIFICADO" | "CONSTANCIA"
  name: string
  text: string
  dni?: string
  finalDocument?: {
    code: string
    dateWords: string
    signedDate: string
  }
}) {
  return (
    <div className={`certificate${finalDocument ? " final-certificate" : ""}`}>
      {!finalDocument ? (
        <span className="certificate-watermark">VISTA PREVIA</span>
      ) : null}
      <div className="certificate-inner">
        <div className="certificate-brand">
          <img src={logoDra} alt="Logo de la DRA Junín" />
          <strong>AGENCIA AGRARIA SATIPO – DRA JUNÍN</strong>
        </div>
        <h2>{title}</h2>
        <p className="awarded-label">Otorgado a</p>
        <p className="certificate-name">{name.toUpperCase()}</p>
        {dni ? <p className="certificate-dni">DNI {dni}</p> : null}
        <p className="certificate-copy">{text}</p>
        <div className="certificate-footer">
          <span>
            {finalDocument
              ? `Satipo, ${finalDocument.dateWords}`
              : "Fecha de emisión: se asignará al firmar"}
          </span>
          {finalDocument ? (
            <span className="final-qr">
              <QrIllustration />
              <strong>{finalDocument.code}</strong>
            </span>
          ) : (
            <span className="qr-placeholder">
              Código QR: se generará al firmar
            </span>
          )}
          <span className="signature">
            <span />
            <strong>Ing. Carlos Mendoza Rivera</strong>
            <small>Director de la Agencia Agraria Satipo</small>
            {finalDocument ? (
              <small>
                Firmado en la plataforma el {finalDocument.signedDate}
              </small>
            ) : null}
          </span>
        </div>
        {finalDocument ? (
          <div className="authenticity-strip">
            Documento registrado de forma inalterable. Verifique su autenticidad
            en verifica.agrojunin.gob.pe o escaneando el código QR.
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PreviewContent({
  eventData,
  beneficiaries,
  modalOpen,
  onBack,
  onOpenModal,
  onCloseModal,
  onConfirm,
}: {
  eventData: EventData
  beneficiaries: Beneficiary[]
  modalOpen: boolean
  onBack: () => void
  onOpenModal: () => void
  onCloseModal: () => void
  onConfirm: () => void
}) {
  const firstBeneficiary = beneficiaries[0]
  const firstName = firstBeneficiary
    ? `${firstBeneficiary.names} ${firstBeneficiary.surnames}`.toUpperCase()
    : ""

  return (
    <div className="content-inner area-content preview-content">
      <Steps preview />
      <div className="preview-layout">
        <CertificatePreview
          title="CERTIFICADO"
          name={firstName}
          text={`Por haber participado en el taller de capacitación '${eventData.name}', realizado del ${formatCertificateDateRange(eventData.startDate, eventData.endDate)} en el ${eventData.place}, con una duración de ${eventData.duration}.`}
        />
        <aside className="batch-summary">
          <h2>Resumen del lote</h2>
          <strong className="certificate-count">
            {quantityText(beneficiaries.length, "certificado")}
          </strong>
          <p>{eventData.name}</p>
          <p>
            {formatShortDate(eventData.startDate)} –{" "}
            {formatShortDate(eventData.endDate)}
          </p>
          <ol>
            {beneficiaries.map((beneficiary) => (
              <li key={beneficiary.id}>
                {beneficiary.names} {beneficiary.surnames}
              </li>
            ))}
          </ol>
          <p className="summary-note">
            Se generará un certificado por cada beneficiario.
          </p>
        </aside>
      </div>
      <div className="preview-actions">
        <Button variant="secondary" onClick={onBack}>
          Volver
        </Button>
        <Button onClick={onOpenModal}>Enviar a revisión</Button>
      </div>
      {modalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-title"
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Cerrar"
              onClick={onCloseModal}
            >
              <X />
            </button>
            <h2 id="send-title">Enviar a revisión</h2>
            <p>
              ¿Enviar {quantityText(beneficiaries.length, "certificado")} a revisión del
              Director? Mientras estén en revisión no podrá modificarlos.
            </p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={onCloseModal}>
                Cancelar
              </Button>
              <Button onClick={onConfirm}>Enviar</Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function ReviewQueue({
  items,
  selected,
  onSelect,
  onOpen,
  onSign,
}: {
  items: DirectorItem[]
  selected: string[]
  onSelect: (id: string, checked: boolean) => void
  onOpen: (item: DirectorItem) => void
  onSign: () => void
}) {
  const selectedItems = items.filter((item) => selected.includes(item.id))
  const certificateCount = selectedItems.reduce(
    (total, item) => total + (item.beneficiaries?.length ?? 1),
    0,
  )

  return (
    <div className="content-inner area-content director-content">
      <p className="page-intro">
        Documentos enviados por las áreas, del más antiguo al más reciente.
      </p>
      <section className="table-card">
        {items.length ? (
          <div className="table-scroll">
            <table className="review-table">
              <thead>
                <tr>
                  <th aria-label="Selección" />
                  <th>Tipo</th>
                  <th>Beneficiario(s)</th>
                  <th>Área</th>
                  <th>Enviado por</th>
                  <th>Fecha de envío</th>
                  <th>Revisión</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} onClick={() => onOpen(item)}>
                    <td onClick={(event) => event.stopPropagation()}>
                      <span
                        className="checkbox-tooltip"
                        title={
                          item.reviewed
                            ? undefined
                            : "Revise el documento antes de seleccionarlo."
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(item.id)}
                          disabled={!item.reviewed}
                          aria-label={`Seleccionar ${item.code}`}
                          onChange={(event) =>
                            onSelect(item.id, event.target.checked)
                          }
                        />
                      </span>
                    </td>
                    <td>{item.type}</td>
                    <td>
                      <span className="queue-beneficiary">
                        {item.beneficiaries ? <Users /> : null}
                        {item.beneficiary}
                        {item.corrected ? (
                          <span className="corrected-chip">Corregido</span>
                        ) : null}
                        {item.reissue ? (
                          <span className="reissue-chip">Reemisión</span>
                        ) : null}
                      </span>
                    </td>
                    <td>{item.area}</td>
                    <td>{item.submittedBy}</td>
                    <td>{item.submittedDate}</td>
                    <td>
                      {item.reviewed ? (
                        <span className="reviewed-label">
                          <CheckCircle2 />
                          Revisado
                        </span>
                      ) : (
                        <span className="not-reviewed">Sin revisar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="¡Todo al día! No tiene documentos pendientes de revisión." />
        )}
      </section>
      {selected.length ? (
        <div className="selection-bar">
          <strong>
            {quantityText(selected.length, "seleccionado")} (
            {quantityText(certificateCount, "certificado")})
          </strong>
          <Button onClick={onSign}>Firmar seleccionados</Button>
        </div>
      ) : null}
    </div>
  )
}

function ReviewInfo({ item }: { item: DirectorItem }) {
  if (item.event) {
    return (
      <section className="review-info">
        <span>
          <small>Taller</small>
          <strong>{item.event.name}</strong>
        </span>
        <span>
          <small>Fechas</small>
          <strong>
            {formatShortDate(item.event.startDate)} –{" "}
            {formatShortDate(item.event.endDate)}
          </strong>
        </span>
        <span>
          <small>Duración</small>
          <strong>{item.event.duration}</strong>
        </span>
        <span>
          <small>Lugar</small>
          <strong>{item.event.place}</strong>
        </span>
        <span>
          <small>Área organizadora</small>
          <strong>{item.event.area}</strong>
        </span>
        <span>
          <small>Enviado por</small>
          <strong>{item.submittedBy}</strong>
        </span>
      </section>
    )
  }
  return (
    <section className="review-info individual-info">
      {[
        ["Tipo", item.type],
        ["Beneficiario", item.beneficiary],
        ["Código", item.code],
        ["DNI", item.dni ?? "—"],
        ["N.° de expediente", item.expediente ?? "—"],
        ["Área", item.area],
        ["Enviado por", item.submittedBy],
        ["Fecha de envío", item.submittedDate],
      ].map(([label, value]) => (
        <span key={label}>
          <small>{label}</small>
          <strong>{value}</strong>
        </span>
      ))}
    </section>
  )
}

function LotReview({
  item,
  activeIndex,
  checkedBeneficiaries,
  onActiveIndex,
  onCheckBeneficiary,
  onBack,
  onReason,
  onSign,
}: {
  item: DirectorItem
  activeIndex: number
  checkedBeneficiaries: number[]
  onActiveIndex: (index: number) => void
  onCheckBeneficiary: (id: number, checked: boolean) => void
  onBack: () => void
  onReason: (
    action: "observe-lot" | "observe-selected" | "reject-lot",
  ) => void
  onSign: () => void
}) {
  const beneficiaries = item.beneficiaries ?? []
  const beneficiary = beneficiaries[activeIndex]
  const event = item.event ?? initialEventData

  return (
    <div className="content-inner area-content review-page">
      <button className="back-link" type="button" onClick={onBack}>
        ← Volver a Por revisar
      </button>
      <ReviewInfo item={item} />
      <div className="lot-review-layout">
        <div>
          <CertificatePreview
            title="CERTIFICADO"
            name={`${beneficiary.names} ${beneficiary.surnames}`}
            text={`Por haber participado en el taller de capacitación '${event.name}', realizado del ${formatCertificateDateRange(event.startDate, event.endDate)} en el ${event.place}, con una duración de ${event.duration}.`}
          />
          <div className="certificate-pagination">
            <Button
              variant="secondary"
              disabled={activeIndex === 0}
              onClick={() => onActiveIndex(activeIndex - 1)}
            >
              ‹ Anterior
            </Button>
            <strong>
              Certificado {activeIndex + 1} de {beneficiaries.length}
            </strong>
            <Button
              variant="secondary"
              disabled={activeIndex === beneficiaries.length - 1}
              onClick={() => onActiveIndex(activeIndex + 1)}
            >
              Siguiente ›
            </Button>
          </div>
        </div>
        <aside className="beneficiary-review-list">
          <h2>Beneficiarios</h2>
          {beneficiaries.map((person, index) => (
            <div
              className={`review-person${
                activeIndex === index ? " active" : ""
              }`}
              key={person.id}
            >
              <input
                type="checkbox"
                checked={checkedBeneficiaries.includes(person.id)}
                aria-label={`Seleccionar ${person.names} ${person.surnames}`}
                onChange={(event) =>
                  onCheckBeneficiary(person.id, event.target.checked)
                }
              />
              <button type="button" onClick={() => onActiveIndex(index)}>
                <strong>
                  {person.names} {person.surnames}
                </strong>
                <span>DNI {person.dni}</span>
              </button>
            </div>
          ))}
        </aside>
      </div>
      <div className="review-actions">
        <Button variant="warning" onClick={() => onReason("reject-lot")}>
          Rechazar lote
        </Button>
        <Button variant="secondary" onClick={() => onReason("observe-lot")}>
          Observar lote
        </Button>
        <Button
          variant="secondary"
          disabled={!checkedBeneficiaries.length}
          onClick={() => onReason("observe-selected")}
        >
          Observar seleccionados
        </Button>
        <Button onClick={onSign}>Firmar lote</Button>
      </div>
    </div>
  )
}

function IndividualReview({
  item,
  onBack,
  onReason,
  onSign,
}: {
  item: DirectorItem
  onBack: () => void
  onReason: (action: "observe-document" | "reject-document") => void
  onSign: () => void
}) {
  return (
    <div className="content-inner area-content review-page">
      <button className="back-link" type="button" onClick={onBack}>
        ← Volver a Por revisar
      </button>
      {item.reissue ? (
        <div className="reissue-review-note">
          <RefreshCw />
          <span>
            <strong>Este documento reemplaza a {item.reissue.originalCode}</strong>
            <span>Cambios:</span>
            <ul>
              {item.reissue.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
            <span>Motivo de la reemisión: {item.reissue.reason}</span>
          </span>
        </div>
      ) : null}
      <ReviewInfo item={item} />
      {item.history?.length ? (
        <section className="review-history-card">
          <h2>Historial</h2>
          {item.history.map((event) => (
            <div key={`${event.at}-${event.text}`}>
              <HistoryEventIcon text={event.text} />
              <span>
                <strong>{event.text}</strong>
                <small>{formatDateTime(event.at)}</small>
              </span>
            </div>
          ))}
        </section>
      ) : null}
      <div className="individual-certificate">
        <CertificatePreview
          title={item.certificateTitle}
          name={item.beneficiary}
          text={item.certificateText ?? ""}
        />
      </div>
      <div className="review-actions">
        <Button
          variant="warning"
          onClick={() => onReason("reject-document")}
        >
          Rechazar
        </Button>
        <Button
          variant="secondary"
          onClick={() => onReason("observe-document")}
        >
          Observar
        </Button>
        <Button onClick={onSign}>Firmar</Button>
      </div>
    </div>
  )
}

type ReasonAction =
  | "observe-lot"
  | "observe-selected"
  | "reject-lot"
  | "observe-document"
  | "reject-document"

function ReasonModal({
  action,
  reason,
  onReason,
  onCancel,
  onConfirm,
}: {
  action: ReasonAction
  reason: string
  onReason: (reason: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const titles: Record<ReasonAction, string> = {
    "observe-lot": "Observar lote",
    "observe-selected": "Observar beneficiarios seleccionados",
    "reject-lot": "Rechazar lote",
    "observe-document": "Observar documento",
    "reject-document": "Rechazar documento",
  }
  const rejection = action.startsWith("reject")

  return (
    <div className="modal-backdrop">
      <section className="confirmation-modal reason-modal" role="dialog" aria-modal>
        <h2>{titles[action]}</h2>
        {rejection ? (
          <div className="rejection-warning">
            <CircleAlert />
            El rechazo es definitivo. El documento no podrá reenviarse.
          </div>
        ) : null}
        <label>
          <span>Motivo</span>
          <textarea
            value={reason}
            placeholder="Explique qué debe corregirse"
            onChange={(event) => onReason(event.target.value)}
          />
        </label>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant={rejection ? "warning" : "primary"}
            disabled={!reason.trim()}
            onClick={onConfirm}
          >
            Confirmar
          </Button>
        </div>
      </section>
    </div>
  )
}

type SignFlow = {
  ids: string[]
  failedIds: string[]
  count: number
  actionLabel: string
  stage: "confirm" | "progress" | "success"
  progress: number
  detail: string
  successText: string
  failureText?: string
  returnText?: string
  replacementTexts?: string[]
}

function SignatureModal({
  flow,
  onCancel,
  onConfirm,
  onFinish,
}: {
  flow: SignFlow
  onCancel: () => void
  onConfirm: () => void
  onFinish: () => void
}) {
  const steps = [
    "Verificando su billetera",
    `Preparando los documentos (${flow.count - flow.failedIds.length} de ${flow.count} ${
      flow.count === 1 ? "preparado" : "preparados"
    })`,
    "Registrando la firma",
    "Confirmando el registro",
  ]

  return (
    <div className="modal-backdrop signature-backdrop">
      <section
        className={`signature-modal signature-${flow.stage}`}
        role="dialog"
        aria-modal
      >
        {flow.stage === "confirm" ? (
          <>
            <div className="wallet-heading">
              <span>
                <Wallet />
              </span>
              <h2>MetaMask – Confirmar firma (simulación)</h2>
            </div>
            <div className="wallet-details">
              <p>
                <strong>Cuenta:</strong> Ing. Carlos Mendoza Rivera
                (0x7c1E…4B9a)
              </p>
              <p>
                <strong>Acción:</strong> {flow.actionLabel}
              </p>
              <p>
                <strong>Costo de la operación:</strong> Sin costo
              </p>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={onCancel}>
                Cancelar
              </Button>
              <Button onClick={onConfirm}>Confirmar</Button>
            </div>
          </>
        ) : null}
        {flow.stage === "progress" ? (
          <>
            <h2>Firmando documentos</h2>
            <div className="signature-steps">
              {steps.map((step, index) => (
                <div
                  className={
                    index < flow.progress
                      ? "done"
                      : index === flow.progress
                        ? "current"
                        : ""
                  }
                  key={step}
                >
                  <span>
                    {index < flow.progress ? (
                      <Check />
                    ) : index === flow.progress ? (
                      <LoaderCircle />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {step}
                </div>
              ))}
            </div>
            {flow.failedIds.length && flow.progress >= 1 ? (
              <div className="preparation-warning">
                <CircleAlert />
                {flow.failedIds.length} documento no pudo prepararse
              </div>
            ) : null}
          </>
        ) : null}
        {flow.stage === "success" ? (
          <div className="signature-success">
            <span className="success-icon">
              <CheckCircle2 />
            </span>
            <h2>¡Listo! {flow.successText}</h2>
            <p>{flow.detail}</p>
            {flow.returnText ? <p>{flow.returnText}</p> : null}
            {flow.replacementTexts?.map((text) => (
              <p key={text}>{text}</p>
            ))}
            {flow.failureText ? (
              <div className="preparation-warning result">
                <CircleAlert />
                {flow.failureText}
              </div>
            ) : null}
            <p>Mesa de Partes fue notificada para su impresión y entrega.</p>
            <Button onClick={onFinish}>Volver a Por revisar</Button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

type AnnulFlow = {
  document: RegistryDocument
  reason: string
  stage: "reason" | "confirm" | "progress" | "success"
  progress: number
}

function AnnulmentModal({
  flow,
  onReason,
  onCancel,
  onContinue,
  onFinish,
}: {
  flow: AnnulFlow
  onReason: (reason: string) => void
  onCancel: () => void
  onContinue: () => void
  onFinish: () => void
}) {
  const steps = [
    "Verificando su billetera",
    "Registrando la anulación",
    "Confirmando el registro",
  ]
  return (
    <div className="modal-backdrop">
      <section className="signature-modal annulment-modal" role="dialog" aria-modal>
        {flow.stage === "reason" ? (
          <>
            <h2>Anular documento</h2>
            <div className="rejection-warning">
              <CircleAlert />
              La anulación es definitiva. El documento dejará de ser válido
              cuando se verifique su autenticidad.
            </div>
            <p>
              <strong>{flow.document.code}</strong>
              <br />
              {flow.document.beneficiary}
            </p>
            <label className="reissue-reason">
              <span>Motivo</span>
              <textarea
                value={flow.reason}
                placeholder="Ej.: Emitido por error: el beneficiario no asistió al taller"
                onChange={(event) => onReason(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              <Button variant="secondary" onClick={onCancel}>
                Cancelar
              </Button>
              <Button
                variant="warning"
                disabled={!flow.reason.trim()}
                onClick={onContinue}
              >
                Anular
              </Button>
            </div>
          </>
        ) : null}
        {flow.stage === "confirm" ? (
          <>
            <div className="wallet-heading">
              <span>
                <Wallet />
              </span>
              <h2>MetaMask – Confirmar firma (simulación)</h2>
            </div>
            <div className="wallet-details">
              <p>
                <strong>Cuenta:</strong> Ing. Carlos Mendoza Rivera
                (0x7c1E…4B9a)
              </p>
              <p>
                <strong>Acción:</strong> Anular 1 documento
              </p>
              <p>
                <strong>Costo de la operación:</strong> Sin costo
              </p>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={onCancel}>
                Cancelar
              </Button>
              <Button onClick={onContinue}>Confirmar</Button>
            </div>
          </>
        ) : null}
        {flow.stage === "progress" ? (
          <>
            <h2>Anulando documento</h2>
            <div className="signature-steps">
              {steps.map((step, index) => (
                <div
                  className={
                    index < flow.progress
                      ? "done"
                      : index === flow.progress
                        ? "current"
                        : ""
                  }
                  key={step}
                >
                  <span>
                    {index < flow.progress ? (
                      <Check />
                    ) : index === flow.progress ? (
                      <LoaderCircle />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </>
        ) : null}
        {flow.stage === "success" ? (
          <div className="signature-success">
            <span className="success-icon annulled">
              <CircleSlash2 />
            </span>
            <h2>Documento anulado</h2>
            <p>
              {flow.document.code}
              <br />
              {flow.document.beneficiary}
            </p>
            <Button onClick={onFinish}>Volver a Documentos firmados</Button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function SignedDocuments({
  documents,
  search,
  onSearch,
  onAnnul,
}: {
  documents: RegistryDocument[]
  search: string
  onSearch: (search: string) => void
  onAnnul: (document: RegistryDocument) => void
}) {
  const [expanded, setExpanded] = useState<string[]>([])
  const query = search.trim().toLowerCase()
  const filtered = documents.filter(
    (document) =>
      document.code.toLowerCase().includes(query) ||
      document.beneficiary.toLowerCase().includes(query) ||
      document.lotCode?.toLowerCase().includes(query),
  )
  const lots = new Map<string, RegistryDocument[]>()
  const individuals: RegistryDocument[] = []
  filtered.forEach((document) => {
    if (document.lotCode) {
      lots.set(document.lotCode, [
        ...(lots.get(document.lotCode) ?? []),
        document,
      ])
    } else {
      individuals.push(document)
    }
  })
  const orderedEntries: Array<
    | { kind: "lot"; lot: string; members: RegistryDocument[]; signedAt: string }
    | { kind: "document"; document: RegistryDocument; signedAt: string }
  > = [
    ...[...lots.entries()].map(([lot, members]) => ({
      kind: "lot" as const,
      lot,
      members,
      signedAt: members.reduce(
        (latest, document) =>
          new Date(document.signedAt) > new Date(latest)
            ? document.signedAt
            : latest,
        members[0].signedAt,
      ),
    })),
    ...individuals.map((document) => ({
      kind: "document" as const,
      document,
      signedAt: document.signedAt,
    })),
  ].sort(
    (first, second) =>
      new Date(second.signedAt).getTime() -
      new Date(first.signedAt).getTime(),
  )

  return (
    <div className="content-inner area-content director-content">
      <label className="signed-search">
        <Search />
        <input
          value={search}
          placeholder="Buscar por nombre o código"
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      <section className="table-card">
        <div className="table-scroll">
          <table className="signed-table">
            <thead>
              <tr>
                <th>Código o lote</th>
                <th>Tipo</th>
                <th>Beneficiario(s)</th>
                <th>Área</th>
                <th>Fecha de firma</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orderedEntries.map((entry) => {
                if (entry.kind === "document") {
                  const document = entry.document
                  return (
                    <tr key={document.code}>
                      <td>
                        <span className="document-code">{document.code}</span>
                      </td>
                      <td>{document.type}</td>
                      <td>
                        {document.beneficiary}
                        <span className="workshop-secondary">
                          DNI {document.dni}
                        </span>
                      </td>
                      <td>{document.area}</td>
                      <td>{signedDateOnly(document.signedAt)}</td>
                      <td>
                        <StatusBadge
                          status={
                            document.deliveryStatus === "annulled"
                              ? "Anulado"
                              : "Firmado"
                          }
                        />
                      </td>
                      <td>
                        {document.deliveryStatus !== "annulled" ? (
                          <Button
                            variant="warning"
                            className="annul-button"
                            onClick={() => onAnnul(document)}
                          >
                            Anular
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                }
                const { lot, members } = entry
                const isExpanded = expanded.includes(lot)
                const annulledCount = members.filter(
                  (document) => document.deliveryStatus === "annulled",
                ).length
                return (
                  <Fragment key={lot}>
                    <tr className="lot-row">
                      <td>
                        <span className="lot-code-cell">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((current) =>
                                current.includes(lot)
                                  ? current.filter((item) => item !== lot)
                                  : [...current, lot],
                              )
                            }
                          >
                            <ChevronRight
                              className={isExpanded ? "expanded" : ""}
                            />
                          </button>
                          <Users />
                          <strong>{lot}</strong>
                        </span>
                      </td>
                      <td>{members[0].type}</td>
                      <td>
                        {quantityText(members.length, "certificado")}
                        {annulledCount ? (
                          <span className="annulled-count">
                            {quantityText(annulledCount, "anulado")}
                          </span>
                        ) : null}
                      </td>
                      <td>{members[0].area}</td>
                      <td>{signedDateOnly(entry.signedAt)}</td>
                      <td>
                        <StatusBadge status="Firmado" />
                      </td>
                      <td>—</td>
                    </tr>
                    {isExpanded
                      ? members.map((document) => (
                          <tr className="lot-child-row" key={document.code}>
                            <td>{document.code}</td>
                            <td>{document.type}</td>
                            <td>
                              {document.beneficiary}
                              <span className="workshop-secondary">
                                DNI {document.dni}
                              </span>
                            </td>
                            <td>{document.area}</td>
                            <td>{signedDateOnly(document.signedAt)}</td>
                            <td>
                              <StatusBadge
                                status={
                                  document.deliveryStatus === "annulled"
                                    ? "Anulado"
                                    : "Firmado"
                                }
                              />
                            </td>
                            <td>
                              {document.deliveryStatus !== "annulled" ? (
                                <Button
                                  variant="warning"
                                  className="annul-button"
                                  onClick={() => onAnnul(document)}
                                >
                                  Anular
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        ))
                      : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

type ConsultationFilter =
  | "Todos"
  | "Listos para entregar"
  | "Firmados"
  | "Anulados"

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}/${date.getFullYear()} ${String(date.getHours()).padStart(
    2,
    "0",
  )}:${String(date.getMinutes()).padStart(2, "0")}`
}

function isoFromDisplayDate(value: string, time: string) {
  const [day, month, year] = value.split("/")
  return `${year}-${month}-${day}T${time}:00`
}

function signedDateOnly(value: string) {
  return formatDateTime(value).slice(0, 10)
}

function HistoryEventIcon({ text }: { text: string }) {
  if (text.startsWith("Anulado")) {
    return (
      <span className="history-event-icon annulled">
        <CircleSlash2 />
      </span>
    )
  }
  if (text.startsWith("Rechazado")) {
    return (
      <span className="history-event-icon rejected">
        <XCircle />
      </span>
    )
  }
  if (
    text.startsWith("Observado") ||
    text.startsWith("Error al preparar")
  ) {
    return (
      <span className="history-event-icon observed">
        <CircleAlert />
      </span>
    )
  }
  return (
    <span className="history-event-icon normal">
      <CheckCircle2 />
    </span>
  )
}

function dateInWords(value: string) {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "setiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ]
  const date = new Date(value)
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

function deliveryLabel(status: RegistryDocument["deliveryStatus"]) {
  if (status === "ready") {
    return <span className="delivery-chip ready">Listo para entregar</span>
  }
  if (status === "printed") {
    return <span className="delivery-chip printed">Impreso</span>
  }
  return (
    <span className="delivery-chip annulled">
      <CircleSlash2 />
      Anulado
    </span>
  )
}

function ConsultationSearch({
  documents,
  query,
  filter,
  expandedLots,
  onQuery,
  onFilter,
  onToggleLot,
  onOpen,
  onPrintLot,
}: {
  documents: RegistryDocument[]
  query: string
  filter: ConsultationFilter
  expandedLots: string[]
  onQuery: (query: string) => void
  onFilter: (filter: ConsultationFilter) => void
  onToggleLot: (lot: string) => void
  onOpen: (document: RegistryDocument) => void
  onPrintLot: (documents: RegistryDocument[]) => void
}) {
  const filters: ConsultationFilter[] = [
    "Todos",
    "Listos para entregar",
    "Firmados",
    "Anulados",
  ]
  const byFilter = documents.filter((document) => {
    if (filter === "Listos para entregar")
      return document.deliveryStatus === "ready"
    if (filter === "Anulados") return document.deliveryStatus === "annulled"
    if (filter === "Firmados") return document.deliveryStatus !== "annulled"
    return true
  })
  const searchValue = normalized(query.trim())
  const groups = new Map<string, RegistryDocument[]>()
  const individuals: RegistryDocument[] = []
  byFilter.forEach((document) => {
    if (document.lotCode) {
      groups.set(document.lotCode, [
        ...(groups.get(document.lotCode) ?? []),
        document,
      ])
    } else {
      individuals.push(document)
    }
  })
  const matchesDocument = (document: RegistryDocument) =>
    [
      document.code,
      document.beneficiary,
      document.dni,
      document.expediente ?? "",
      document.lotCode ?? "",
      document.lotCode?.replace("Lote ", "") ?? "",
    ].some((value) => normalized(value).includes(searchValue))
  const visibleGroups = [...groups.entries()]
    .map(([lot, members]) => {
      const lotMatches =
        !searchValue ||
        normalized(lot).includes(searchValue) ||
        normalized(lot.replace("Lote ", "")).includes(searchValue) ||
        normalized(members[0]?.workshop ?? "").includes(searchValue)
      const matchingMembers = lotMatches
        ? members
        : members.filter(matchesDocument)
      return {
        lot,
        members,
        visibleMembers: matchingMembers,
        forceExpanded: Boolean(searchValue && !lotMatches && matchingMembers.length),
      }
    })
    .filter((group) => group.visibleMembers.length)
  const visibleIndividuals = searchValue
    ? individuals.filter(matchesDocument)
    : individuals
  const hasResults = visibleGroups.length || visibleIndividuals.length

  return (
    <div className="content-inner area-content consultation-content">
      <label className="consultation-search">
        <Search />
        <input
          value={query}
          placeholder="Buscar por nombre, DNI, código o número de expediente"
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
      <div className="document-tabs" role="tablist" aria-label="Filtros">
        {filters.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={filter === item}
            className={filter === item ? "document-tab active" : "document-tab"}
            key={item}
            onClick={() => onFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <section className="table-card">
        {hasResults ? (
          <div className="table-scroll">
            <table className="consultation-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Beneficiario</th>
                  <th>DNI</th>
                  <th>Expediente</th>
                  <th>Área</th>
                  <th>Estado</th>
                  <th>Fecha de firma</th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map((group) => {
                  const expanded =
                    expandedLots.includes(group.lot) || group.forceExpanded
                  const allPrinted = group.members.every(
                    (document) =>
                      document.deliveryStatus === "printed" ||
                      document.deliveryStatus === "annulled",
                  )
                  const validMembers = group.members.filter(
                    (document) => document.deliveryStatus !== "annulled",
                  )
                  const annulledCount =
                    group.members.length - validMembers.length
                  return (
                    <Fragment key={group.lot}>
                      <tr className="lot-row">
                        <td>
                          <span className="lot-code-cell">
                            <button
                              type="button"
                              aria-label={
                                expanded ? "Contraer lote" : "Desplegar lote"
                              }
                              onClick={() => onToggleLot(group.lot)}
                            >
                              <ChevronRight
                                className={expanded ? "expanded" : ""}
                              />
                            </button>
                            <Users />
                            <strong>{group.lot}</strong>
                          </span>
                        </td>
                        <td>{group.members[0].type}</td>
                        <td>
                          <strong>
                            {quantityText(
                              group.members.length,
                              "certificado",
                            )}
                          </strong>
                          <span className="workshop-secondary">
                            {group.members[0].workshop}
                          </span>
                        </td>
                        <td>—</td>
                        <td>—</td>
                        <td>{group.members[0].area}</td>
                        <td>
                          <span className="stacked-status">
                            <StatusBadge status="Firmado" />
                            {deliveryLabel(allPrinted ? "printed" : "ready")}
                            {annulledCount ? (
                              <span className="annulled-count">
                                {quantityText(annulledCount, "anulado")}
                              </span>
                            ) : null}
                            {validMembers.length ? (
                              <Button
                                variant="secondary"
                                className="print-lot-button"
                                onClick={() => onPrintLot(validMembers)}
                              >
                                Imprimir lote ({validMembers.length})
                              </Button>
                            ) : null}
                          </span>
                        </td>
                        <td>{signedDateOnly(group.members[0].signedAt)}</td>
                      </tr>
                      {expanded
                        ? group.visibleMembers.map((document) => (
                            <tr
                              className="lot-child-row"
                              key={document.code}
                              onClick={() => onOpen(document)}
                            >
                              <td>{document.code}</td>
                              <td>{document.type}</td>
                              <td>{document.beneficiary}</td>
                              <td>{document.dni}</td>
                              <td>{document.expediente ?? "—"}</td>
                              <td>{document.area}</td>
                              <td>
                                <span className="stacked-status">
                                  {document.deliveryStatus === "annulled" ? (
                                    <StatusBadge status="Anulado" />
                                  ) : (
                                    <>
                                      <StatusBadge status="Firmado" />
                                      {deliveryLabel(document.deliveryStatus)}
                                    </>
                                  )}
                                </span>
                              </td>
                              <td>{signedDateOnly(document.signedAt)}</td>
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  )
                })}
                {visibleIndividuals.map((document) => (
                  <tr
                    className="clickable-document-row"
                    key={document.code}
                    onClick={() => onOpen(document)}
                  >
                    <td>
                      <span className="document-code">{document.code}</span>
                    </td>
                    <td>{document.type}</td>
                    <td>
                      {document.beneficiary}
                      {document.workshop ? (
                        <span className="workshop-secondary">
                          {document.workshop}
                        </span>
                      ) : null}
                    </td>
                    <td>{document.dni}</td>
                    <td>{document.expediente ?? "—"}</td>
                    <td>{document.area}</td>
                    <td>
                      <span className="stacked-status">
                        {document.deliveryStatus === "annulled" ? (
                          <StatusBadge status="Anulado" />
                        ) : (
                          <>
                            <StatusBadge status="Firmado" />
                            {deliveryLabel(document.deliveryStatus)}
                          </>
                        )}
                      </span>
                    </td>
                    <td>{signedDateOnly(document.signedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No se encontraron documentos con esos datos." />
        )}
      </section>
    </div>
  )
}

function deterministicString(seed: string, alphabet: string, length: number) {
  let value = 2166136261
  let result = ""
  for (let index = 0; index < length; index += 1) {
    const character = seed.charCodeAt(index % seed.length)
    value = Math.imul(value ^ character ^ index, 16777619)
    result += alphabet[Math.abs(value) % alphabet.length]
  }
  return result
}

function DocumentDetail({
  document,
  technicalOpen,
  onTechnicalOpen,
  onBack,
  onView,
  onDownload,
  onPrint,
  onCopy,
}: {
  document: RegistryDocument
  technicalOpen: boolean
  onTechnicalOpen: () => void
  onBack: () => void
  onView: () => void
  onDownload: () => void
  onPrint: () => void
  onCopy: (value: string) => void
}) {
  const auditRows = [
    [
      "Huella digital del documento (SHA-256)",
      deterministicString(document.code, "0123456789abcdef", 64),
    ],
    [
      "Identificador de almacenamiento (CID)",
      `bafybei${deterministicString(document.code, "abcdefghijklmnopqrstuvwxyz234567", 52)}`,
    ],
    [
      "Transacción de registro",
      `0x${deterministicString(`${document.code}-registro`, "0123456789abcdef", 64)}`,
    ],
    ["Billetera firmante", "0x7c1E…4B9a"],
    ["Fecha y hora del registro", formatDateTime(document.signedAt)],
    ...(document.annulmentRecord
      ? [["Transacción de anulación", document.annulmentRecord]]
      : []),
  ]
  const history = [
    {
      at: document.registeredAt,
      text: `Registrado por ${document.registeredBy} (${document.area})`,
    },
    { at: document.submittedAt, text: "Enviado a revisión" },
    {
      at: document.reviewedAt,
      text: "Revisado por Ing. Carlos Mendoza Rivera",
    },
    ...(document.history ?? []).filter(
      (event) =>
        ![
          "Registrado por",
          "Enviado a revisión",
          "Revisado por",
          "Firmado por",
        ].some((prefix) => event.text.startsWith(prefix)),
    ),
    {
      at: document.signedAt,
      text: "Firmado por Ing. Carlos Mendoza Rivera",
    },
    {
      at: document.signedAt,
      text: "Mesa de Partes notificada para su entrega",
    },
    ...document.prints.map((print) => ({
      at: print.at,
      text: print.duplicate
        ? "Duplicado impreso por Luis Torres Paredes"
        : "Impreso por Luis Torres Paredes",
    })),
  ].sort(
    (first, second) =>
      new Date(first.at).getTime() - new Date(second.at).getTime(),
  )

  return (
    <div className="content-inner area-content document-detail">
      <button className="back-link" type="button" onClick={onBack}>
        ← Volver a Buscar documentos
      </button>
      <div className="detail-heading">
        <div>
          <h2>{document.code}</h2>
          <p>{document.type}</p>
        </div>
        <span className="stacked-status">
          {document.deliveryStatus === "annulled" ? (
            <StatusBadge status="Anulado" />
          ) : (
            <>
              <StatusBadge status="Firmado" />
              {deliveryLabel(document.deliveryStatus)}
            </>
          )}
        </span>
      </div>
      <div className="detail-grid">
        <section className="detail-card">
          <h2>Datos</h2>
          <dl>
            {[
              ["Beneficiario", document.beneficiary],
              ["DNI", document.dni],
              ["Tipo", document.type],
              [
                "Origen",
                document.expediente ? "A solicitud de parte" : "De oficio",
              ],
              ["N.° de expediente", document.expediente ?? "—"],
              ["Área", document.area],
              ["Lote", document.lotCode ?? "—"],
              ["Taller", document.workshop ?? "—"],
              [
                "Fechas del evento",
                document.eventStart && document.eventEnd
                  ? `${formatShortDate(document.eventStart)} – ${formatShortDate(
                      document.eventEnd,
                    )}`
                  : "—",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="detail-card">
          <h2>Historial</h2>
          <div className="history-timeline">
            {history.map((event, index) => (
              <div key={`${event.text}-${event.at}-${index}`}>
                <HistoryEventIcon text={event.text} />
                <strong>{event.text}</strong>
                <small>{formatDateTime(event.at)}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="technical-card">
        <button type="button" onClick={onTechnicalOpen}>
          <ChevronRight className={technicalOpen ? "expanded" : ""} />
          Detalle técnico de auditoría
        </button>
        {technicalOpen ? (
          <div className="technical-rows">
            {auditRows.map(([label, value]) => (
              <div key={label}>
                <span>
                  <strong>{label}</strong>
                  <code>{value}</code>
                </span>
                <button
                  type="button"
                  aria-label={`Copiar ${label}`}
                  onClick={() => onCopy(value)}
                >
                  <Copy />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      {document.deliveryStatus !== "annulled" ? (
        <div className="detail-actions">
          <Button onClick={onView}>Ver documento</Button>
          <Button variant="secondary" onClick={onDownload}>
            Descargar PDF
          </Button>
          <Button variant="secondary" onClick={onPrint}>
            Imprimir
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function FinalDocument({
  document,
  onBack,
  onDownload,
  onPrint,
}: {
  document: RegistryDocument
  onBack: () => void
  onDownload: () => void
  onPrint: () => void
}) {
  return (
    <div className="content-inner area-content final-document-page">
      <button className="back-link" type="button" onClick={onBack}>
        ← Volver al detalle
      </button>
      <div className="final-document-wrap">
        <CertificatePreview
          title={document.certificateTitle}
          name={document.beneficiary}
          text={document.certificateText}
          dni={document.dni}
          finalDocument={{
            code: document.code,
            dateWords: dateInWords(document.signedAt),
            signedDate: signedDateOnly(document.signedAt),
          }}
        />
      </div>
      <div className="final-document-actions">
        <Button variant="secondary" onClick={onDownload}>
          Descargar PDF
        </Button>
        <Button variant="secondary" onClick={onPrint}>
          Imprimir
        </Button>
      </div>
      <div className="reprint-note">
        <Info />
        Puede volver a imprimir este documento cuando sea necesario, por
        ejemplo, ante una pérdida (duplicado).
      </div>
    </div>
  )
}

function CaseNotice({ record }: { record: CaseRecord }) {
  if (
    !record.reason ||
    !record.actionAt ||
    !["Observado", "Rechazado"].includes(record.status)
  )
    return null
  const rejected = record.status === "Rechazado"
  return (
    <div className={`case-notice ${rejected ? "rejected" : ""}`}>
      <CircleAlert />
      <span>
        <strong>
          {rejected ? "Rechazado" : "Observado"} por Ing. Carlos Mendoza Rivera
          el {formatDateTime(record.actionAt)}
        </strong>
        <span>Motivo: {record.reason}</span>
      </span>
    </div>
  )
}

function AreaReadOnlyDetail({
  record,
  onBack,
  backLabel = "← Volver a Mis documentos",
  registry = [],
  reissuePendingCodes = [],
  onReissue,
}: {
  record: CaseRecord
  onBack: () => void
  backLabel?: string
  registry?: RegistryDocument[]
  reissuePendingCodes?: string[]
  onReissue?: (code: string) => void
}) {
  return (
    <div className="content-inner area-content document-detail">
      <button className="back-link" type="button" onClick={onBack}>
        {backLabel}
      </button>
      <div className="detail-heading">
        <div>
          <h2>{record.code}</h2>
          <p>{record.type}</p>
        </div>
        <span className="detail-heading-actions">
          <StatusBadge status={record.status} />
          {!record.beneficiaries &&
          record.status === "Firmado" &&
          record.submittedBy === "Rosa Quispe Huamán" &&
          onReissue ? (
            reissuePendingCodes.includes(record.code) ? (
              <span className="reissue-pending">Reemisión en revisión</span>
            ) : (
              <Button
                variant="secondary"
                className="reissue-button"
                onClick={() => onReissue(record.code)}
              >
                <RefreshCw />
                Reemitir con corrección
              </Button>
            )
          ) : null}
        </span>
      </div>
      <CaseNotice record={record} />
      <div className="detail-grid">
        <section className="detail-card">
          <h2>Datos</h2>
          <dl>
            {[
              ["Beneficiario", record.beneficiary],
              ["DNI", record.dni || "—"],
              ["Tipo", record.type],
              [
                "Origen",
                record.expediente ? "A solicitud de parte" : "De oficio",
              ],
              ["N.° de expediente", record.expediente ?? "—"],
              ["Área", record.area],
              ["Lote", record.lotCode ?? "—"],
              ["Taller", record.event?.name ?? "—"],
              [
                "Fechas del evento",
                record.event
                  ? `${formatShortDate(record.event.startDate)} – ${formatShortDate(record.event.endDate)}`
                  : "—",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="detail-card">
          <h2>Historial</h2>
          <div className="history-timeline">
            {[...record.history]
              .sort(
                (first, second) =>
                  new Date(first.at).getTime() -
                  new Date(second.at).getTime(),
              )
              .map((event) => (
              <div key={`${event.at}-${event.text}`}>
                <HistoryEventIcon text={event.text} />
                <strong>{event.text}</strong>
                <small>{formatDateTime(event.at)}</small>
              </div>
              ))}
          </div>
        </section>
      </div>
      {record.beneficiaries?.length ? (
        <section className="detail-card">
          <h2>Beneficiarios</h2>
          <table className="case-beneficiaries">
            <thead>
              <tr>
                <th>Código</th>
                <th>Beneficiario</th>
                <th>DNI</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {record.beneficiaries.map((person) => {
                const fullName = `${person.names} ${person.surnames}`
                const storedDocument = registry.find(
                  (document) =>
                    document.lotCode === record.code &&
                    document.beneficiary === fullName,
                )
                const code =
                  storedDocument?.code ??
                  (record.code === "Lote 2026-007"
                    ? lot007Codes[fullName]
                    : generatedDocumentCode(`${record.code}-${fullName}`))
                const registryDocument = registry.find(
                  (document) => document.code === code,
                )
                const status: DocumentStatus =
                  registryDocument?.deliveryStatus === "annulled"
                    ? "Anulado"
                    : record.status
                return (
                  <tr key={person.id}>
                    <td>{code}</td>
                    <td>{fullName}</td>
                    <td>{person.dni}</td>
                    <td>
                      <StatusBadge status={status} />
                      {status === "Firmado" &&
                      record.submittedBy === "Rosa Quispe Huamán" &&
                      onReissue ? (
                        reissuePendingCodes.includes(code) ? (
                          <span className="reissue-pending">
                            Reemisión en revisión
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            className="reissue-button small"
                            onClick={() => onReissue(code)}
                          >
                            <RefreshCw />
                            Reemitir con corrección
                          </Button>
                        )
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  )
}

function IndividualCorrection({
  record,
  draft,
  onDraft,
  onCancel,
  onSubmit,
}: {
  record: CaseRecord
  draft: Beneficiary
  onDraft: (draft: Beneficiary) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const errors = beneficiaryErrors(draft)
  const hasErrors = Object.values(errors).some(Boolean)
  const event = record.event ?? initialEventData
  return (
    <div className="content-inner area-content correction-page">
      <button className="back-link" type="button" onClick={onCancel}>
        ← Volver a Mis documentos
      </button>
      <CaseNotice record={record} />
      <div className="correction-layout">
        <div className="correction-data">
          <section className="detail-card">
            <h2>Datos del evento</h2>
            <dl>
              {[
                ["Taller", event.name],
                [
                  "Fechas",
                  `${formatShortDate(event.startDate)} – ${formatShortDate(event.endDate)}`,
                ],
                ["Duración", event.duration],
                ["Lugar", event.place],
                ["Área", event.area],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="workflow-card">
            <h2>Datos del beneficiario</h2>
            <div className="correction-fields">
              {(["names", "surnames", "dni"] as const).map((key) => (
                <label key={key}>
                  <span>
                    {key === "names"
                      ? "Nombres"
                      : key === "surnames"
                        ? "Apellidos"
                        : "DNI"}
                  </span>
                  <input
                    value={draft[key]}
                    inputMode={key === "dni" ? "numeric" : undefined}
                    onChange={(event) =>
                      onDraft({ ...draft, [key]: event.target.value })
                    }
                  />
                  {errors[key] ? (
                    <span className="field-error">{errors[key]}</span>
                  ) : null}
                </label>
              ))}
            </div>
          </section>
        </div>
        <CertificatePreview
          title="CERTIFICADO"
          name={`${draft.names} ${draft.surnames}`}
          text={`Por haber participado en el taller de capacitación '${event.name}', realizado del ${formatCertificateDateRange(event.startDate, event.endDate)} en el ${event.place}, con una duración de ${event.duration}.`}
        />
      </div>
      <div className="review-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={hasErrors} onClick={onSubmit}>
          Reenviar a revisión
        </Button>
      </div>
    </div>
  )
}

function LotCorrection({
  record,
  eventData,
  beneficiaries,
  onEventData,
  onBeneficiaries,
  onCancel,
  onSubmit,
}: {
  record: CaseRecord
  eventData: EventData
  beneficiaries: Beneficiary[]
  onEventData: (data: EventData) => void
  onBeneficiaries: (beneficiaries: Beneficiary[]) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const errorCount = beneficiaries.reduce(
    (total, person) =>
      total + Object.values(beneficiaryErrors(person)).filter(Boolean).length,
    0,
  )
  return (
    <div className="content-inner area-content correction-page">
      <button className="back-link" type="button" onClick={onCancel}>
        ← Volver a Mis documentos
      </button>
      <CaseNotice record={record} />
      <EventFields
        data={eventData}
        onChange={(key, value) => onEventData({ ...eventData, [key]: value })}
      />
      <section className="workflow-card">
        <div className="beneficiary-heading">
          <h2>Beneficiarios</h2>
          <Button
            variant="secondary"
            onClick={() =>
              onBeneficiaries([
                ...beneficiaries,
                {
                  id:
                    beneficiaries.reduce(
                      (highest, person) => Math.max(highest, person.id),
                      0,
                    ) + 1,
                  names: "",
                  surnames: "",
                  dni: "",
                },
              ])
            }
          >
            <UserPlus />
            Agregar beneficiario
          </Button>
        </div>
        {beneficiaries.length ? (
          <>
            <div
              className={`validation-notice ${
                errorCount ? "validation-error" : "validation-success"
              }`}
            >
              {errorCount ? <CircleAlert /> : <CheckCircle2 />}
              {errorCount
                ? `Hay ${errorCount} ${
                    errorCount === 1 ? "error" : "errores"
                  } en la lista. ${
                    errorCount === 1 ? "Corríjalo" : "Corríjalos"
                  } para continuar.`
                : `${quantityText(
                    beneficiaries.length,
                    "beneficiario",
                  )} ${beneficiaries.length === 1 ? "listo" : "listos"}`}
            </div>
            <table className="beneficiaries-table">
              <thead>
                <tr>
                  <th>N.°</th>
                  <th>Nombres</th>
                  <th>Apellidos</th>
                  <th>DNI</th>
                  <th aria-label="Acción" />
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((person, index) => {
                  const errors = beneficiaryErrors(person)
                  return (
                    <tr
                      className={
                        Object.values(errors).some(Boolean) ? "row-error" : ""
                      }
                      key={person.id}
                    >
                      <td>{index + 1}</td>
                      {(["names", "surnames", "dni"] as const).map((key) => (
                        <td key={key}>
                          <input
                            value={person[key]}
                            onChange={(event) =>
                              onBeneficiaries(
                                beneficiaries.map((item) =>
                                  item.id === person.id
                                    ? { ...item, [key]: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                          {errors[key] ? (
                            <span className="field-error">{errors[key]}</span>
                          ) : null}
                        </td>
                      ))}
                      <td>
                        <button
                          className="delete-row"
                          type="button"
                          onClick={() =>
                            onBeneficiaries(
                              beneficiaries.filter(
                                (item) => item.id !== person.id,
                              ),
                            )
                          }
                        >
                          <Trash2 />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        ) : (
          <EmptyState text="Aún no hay beneficiarios. Agréguelos uno por uno." />
        )}
      </section>
      <div className="review-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          disabled={!beneficiaries.length || errorCount > 0}
          onClick={onSubmit}
        >
          Reenviar lote a revisión
        </Button>
      </div>
    </div>
  )
}

function ReissueScreen({
  original,
  draft,
  eventData,
  reason,
  onDraft,
  onEventData,
  onReason,
  onCancel,
  onSubmit,
}: {
  original: RegistryDocument
  draft: Beneficiary
  eventData: EventData
  reason: string
  onDraft: (draft: Beneficiary) => void
  onEventData: (data: EventData) => void
  onReason: (reason: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const errors = beneficiaryErrors(draft)
  const originalNames = original.beneficiary.split(" ")
  const originalFirstName = originalNames.shift() ?? ""
  const originalSurnames = originalNames.join(" ")
  const hasChanges =
    draft.names !== originalFirstName ||
    draft.surnames !== originalSurnames ||
    draft.dni !== original.dni ||
    eventData.name !== (original.workshop ?? initialEventData.name) ||
    eventData.startDate !== (original.eventStart ?? initialEventData.startDate) ||
    eventData.endDate !== (original.eventEnd ?? initialEventData.endDate) ||
    eventData.duration !== (original.duration ?? initialEventData.duration) ||
    eventData.place !== (original.place ?? initialEventData.place) ||
    eventData.area !== original.area
  const invalid =
    Object.values(errors).some(Boolean) ||
    Object.values(eventData).some((value) => !value.trim()) ||
    !reason.trim() ||
    !hasChanges

  return (
    <div className="content-inner area-content correction-page">
      <button className="back-link" type="button" onClick={onCancel}>
        ← Volver al detalle
      </button>
      <div className="reissue-info">
        <Info />
        Reemisión de {original.code}. Cuando el Director firme el nuevo
        documento, el original se anulará automáticamente.
      </div>
      <div className="correction-layout">
        <div className="correction-data">
          <section className="workflow-card">
            <h2>Datos del beneficiario</h2>
            <div className="correction-fields">
              {(["names", "surnames", "dni"] as const).map((key) => (
                <label key={key}>
                  <span>
                    {key === "names"
                      ? "Nombres"
                      : key === "surnames"
                        ? "Apellidos"
                        : "DNI"}
                  </span>
                  <input
                    value={draft[key]}
                    onChange={(event) =>
                      onDraft({ ...draft, [key]: event.target.value })
                    }
                  />
                  {errors[key] ? (
                    <span className="field-error">{errors[key]}</span>
                  ) : null}
                </label>
              ))}
            </div>
          </section>
          <EventFields
            data={eventData}
            onChange={(key, value) =>
              onEventData({ ...eventData, [key]: value })
            }
          />
          <label className="reissue-reason">
            <span>Motivo de la reemisión</span>
            <textarea
              value={reason}
              placeholder="Ej.: Corrección del apellido del beneficiario"
              onChange={(event) => onReason(event.target.value)}
            />
          </label>
        </div>
        <CertificatePreview
          title={original.certificateTitle}
          name={`${draft.names} ${draft.surnames}`}
          dni={draft.dni}
          text={`Por haber participado en el taller de capacitación '${eventData.name}', realizado del ${formatCertificateDateRange(eventData.startDate, eventData.endDate)} en el ${eventData.place}, con una duración de ${eventData.duration}.`}
        />
      </div>
      <div className="review-actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={invalid} onClick={onSubmit}>
          Enviar a revisión
        </Button>
      </div>
    </div>
  )
}

function ConstructionContent({ title }: { title: string }) {
  return (
    <div className="content-inner construction-wrap">
      <section className="construction-card">
        <span className="construction-illustration" aria-hidden="true">
          <span className="illustration-sheet">
            <span />
            <span />
            <span />
          </span>
          <ShieldCheck />
        </span>
        <h2>{title}</h2>
        <p>En construcción</p>
      </section>
    </div>
  )
}

function InternalApp({
  role,
  onLogout,
  shared,
  setShared,
}: {
  role: RoleKey
  onLogout: () => void
  shared: SharedState
  setShared: React.Dispatch<React.SetStateAction<SharedState>>
}) {
  const noticeIcons: Record<StoredNotice["icon"], LucideIcon> = {
    alert: CircleAlert,
    check: CheckCircle2,
    file: Files,
    package: PackageCheck,
    reject: XCircle,
  }
  const baseConfig = roleConfigs[role]
  const config: RoleConfig = {
    ...baseConfig,
    menu: baseConfig.menu.map((item) =>
      role === "director" && item.label === "Por revisar"
        ? { ...item, count: shared.queue.length }
        : item,
    ),
    summaries: baseConfig.summaries.map((summary) => {
      const changes: Record<string, number> = {
        "Pendientes de firma": shared.metrics.areaPending,
        Observados: shared.metrics.areaObserved,
        "Firmados este mes": shared.metrics.areaSigned,
        "Firmados esta semana": shared.metrics.directorSigned,
        "Observados esta semana": shared.metrics.directorObserved,
        "Listos para entregar": shared.metrics.consultationReady,
        "Impresos esta semana": shared.metrics.consultationPrinted,
        "Duplicados emitidos": shared.metrics.consultationDuplicates,
      }
      if (role === "director" && summary.label === "Por revisar") {
        return { ...summary, value: shared.queue.length }
      }
      return {
        ...summary,
        value: summary.value + (changes[summary.label] ?? 0),
      }
    }),
    notices: shared.notifications[role].map((notice) => ({
      text: notice.text,
      time: notice.time,
      tone: notice.tone,
      icon: noticeIcons[notice.icon],
      read: notice.read,
    })),
  }
  const [activeItem, setActiveItem] = useState("Inicio")
  const [areaPage, setAreaPage] = useState<AreaPage>("home")
  const [documentFilter, setDocumentFilter] =
    useState<DocumentFilter>("Todos")
  const [selectedAreaCode, setSelectedAreaCode] = useState<string | null>(null)
  const [correctionDraft, setCorrectionDraft] = useState<Beneficiary | null>(
    null,
  )
  const [correctionEvent, setCorrectionEvent] =
    useState<EventData>(initialEventData)
  const [correctionBeneficiaries, setCorrectionBeneficiaries] = useState<
    Beneficiary[]
  >([])
  const [reissueOriginalCode, setReissueOriginalCode] = useState<string | null>(
    null,
  )
  const [reissueDraft, setReissueDraft] = useState<Beneficiary | null>(null)
  const [reissueEvent, setReissueEvent] =
    useState<EventData>(initialEventData)
  const [reissueReason, setReissueReason] = useState("")
  const [eventData, setEventData] = useState<EventData>(initialEventData)
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [toast, setToast] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [noticesOpen, setNoticesOpen] = useState(false)
  const [selectedQueue, setSelectedQueue] = useState<string[]>([])
  const [reviewItemId, setReviewItemId] = useState<string | null>(null)
  const [activeBeneficiary, setActiveBeneficiary] = useState(0)
  const [checkedBeneficiaries, setCheckedBeneficiaries] = useState<number[]>([])
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null)
  const [reason, setReason] = useState("")
  const [signFlow, setSignFlow] = useState<SignFlow | null>(null)
  const [annulFlow, setAnnulFlow] = useState<AnnulFlow | null>(null)
  const [signedSearch, setSignedSearch] = useState("")
  const [consultationPage, setConsultationPage] = useState<
    "home" | "search" | "detail" | "final"
  >("home")
  const [consultationQuery, setConsultationQuery] = useState("")
  const [consultationFilter, setConsultationFilter] =
    useState<ConsultationFilter>("Todos")
  const [expandedLots, setExpandedLots] = useState<string[]>([])
  const [selectedRegistryCode, setSelectedRegistryCode] = useState<
    string | null
  >(null)
  const [selectedRejectedCode, setSelectedRejectedCode] = useState<
    string | null
  >(null)
  const [technicalOpen, setTechnicalOpen] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(""), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!signFlow || signFlow.stage !== "progress") return
    const timeout = window.setTimeout(() => {
      const nextProgress = signFlow.progress + 1
      if (nextProgress < 4) {
        setSignFlow({ ...signFlow, progress: nextProgress })
        return
      }
      const attemptedItems = shared.queue.filter((item) =>
        signFlow.ids.includes(item.id),
      )
      const items = attemptedItems.filter(
        (item) => !signFlow.failedIds.includes(item.id),
      )
      const now = new Date()
      const signedAt = now.toISOString()
      const signedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}/${now.getFullYear()}`
      const newSigned: SignedDocument[] = items.map((item) => ({
        code: item.code,
        type: item.type,
        beneficiary: item.beneficiaries
          ? `${item.event?.name} – ${quantityText(
              item.beneficiaries.length,
              "certificado",
            )}`
          : item.beneficiary,
        area: item.area,
        signedDate,
        batch: Boolean(item.beneficiaries),
        session: true,
      }))
      const areaNotices: StoredNotice[] = items
        .filter((item) => item.submittedBy === "Rosa Quispe Huamán")
        .map((item) => ({
          id: `area-signed-${item.id}-${Date.now()}`,
          text: item.reissue
            ? `La reemisión de ${item.reissue.originalCode} fue firmada`
            : item.beneficiaries
            ? `El ${item.code} fue firmado (${quantityText(
                item.beneficiaries.length,
                "certificado",
              )})`
            : `El certificado ${item.code} fue firmado`,
          time: "ahora",
          tone: "green",
          icon: "check",
          read: false,
          targetCode: item.code,
        }))
      const consultationNotices: StoredNotice[] = items.map((item) => ({
          id: `consulta-ready-${item.id}-${Date.now()}`,
        text: item.reissue
          ? `${item.type} ${item.code} listo para entrega física (reemplaza a ${item.reissue.originalCode})`
          : item.beneficiaries
            ? `${item.code} listo para entrega física (${quantityText(
                item.beneficiaries.length,
                "certificado",
              )})`
            : `${item.type} ${item.code} listo para entrega física`,
        time: "ahora",
        tone: "green",
        icon: "package",
        read: false,
        targetCode: item.code,
      }))
      const registryDocuments = items.flatMap((item) =>
        registryDocumentsFromItem(item, signedAt),
      )
      const replacementItems = items.filter((item) => item.reissue)
      const replacedCodes = replacementItems.map(
        (item) => item.reissue!.originalCode,
      )
      const replacedReadyCount = shared.registry.filter(
        (document) =>
          replacedCodes.includes(document.code) &&
          document.deliveryStatus === "ready",
      ).length
      const signedCertificateCount = items.reduce(
        (total, item) => total + (item.beneficiaries?.length ?? 1),
        0,
      )
      const rosaItems = items.filter(
        (item) => item.submittedBy === "Rosa Quispe Huamán",
      )
      const rosaCertificateCount = rosaItems.reduce(
        (total, item) => total + (item.beneficiaries?.length ?? 1),
        0,
      )
      setShared((current) => ({
        ...current,
        queue: current.queue
          .filter((item) => !items.some((signed) => signed.id === item.id))
          .map((item) =>
            signFlow.failedIds.includes(item.id)
              ? {
                  ...item,
                  reviewed: true,
                  history: [
                    ...(item.history ?? []),
                    {
                      at: signedAt,
                      text: "Error al preparar el documento – devuelto a Por revisar",
                    },
                  ],
                }
              : item,
          ),
        signed: [...newSigned, ...current.signed],
        registry: [
          ...registryDocuments,
          ...current.registry.filter(
            (document) =>
              !registryDocuments.some(
                (newDocument) => newDocument.code === document.code,
              ),
          ).map((document) =>
            replacedCodes.includes(document.code)
              ? {
                  ...document,
                  deliveryStatus: "annulled" as const,
                  replacedBy: replacementItems.find(
                    (item) =>
                      item.reissue?.originalCode === document.code,
                  )?.code,
                  annulledAt: signedAt,
                  annulmentReason: "Anulado por reemisión",
                  history: [
                    ...(document.history ?? []),
                    {
                      at: signedAt,
                      text: `Anulado por reemisión – reemplazado por ${
                        replacementItems.find(
                          (item) =>
                            item.reissue?.originalCode === document.code,
                        )?.code
                      }`,
                    },
                  ],
                }
              : document,
          ),
        ],
        documents: current.documents.map((document) => {
          if (replacedCodes.includes(document.code)) {
            return { ...document, status: "Anulado" as const }
          }
          return items.some(
            (item) =>
              item.code === document.code &&
              item.submittedBy === "Rosa Quispe Huamán",
          )
            ? { ...document, status: "Firmado" }
            : document
        }),
        cases: current.cases.map((record) =>
          replacedCodes.includes(record.code)
            ? {
                ...record,
                status: "Anulado",
                history: [
                  ...record.history,
                  {
                    at: signedAt,
                    text: `Anulado por reemisión – reemplazado por ${
                      replacementItems.find(
                        (item) =>
                          item.reissue?.originalCode === record.code,
                      )?.code
                    }`,
                  },
                ],
              }
            : items.some((item) => item.code === record.code)
            ? {
                ...record,
                status: "Firmado",
                history: [
                  ...record.history,
                  {
                    at: signedAt,
                    text: "Firmado por Ing. Carlos Mendoza Rivera",
                  },
                ],
              }
            : record,
        ),
        notifications: {
          ...current.notifications,
          area: [...areaNotices, ...current.notifications.area],
          consulta: [
            ...consultationNotices,
            ...current.notifications.consulta,
          ],
        },
        metrics: {
          ...current.metrics,
          areaPending: current.metrics.areaPending - rosaItems.length,
          areaSigned: current.metrics.areaSigned + rosaCertificateCount,
          directorSigned:
            current.metrics.directorSigned + signedCertificateCount,
          consultationReady:
            current.metrics.consultationReady +
            items.length -
            replacedReadyCount,
        },
        luciaFailedOnce:
          current.luciaFailedOnce || signFlow.failedIds.length > 0,
      }))
      setSelectedQueue([])
      setSignFlow({ ...signFlow, stage: "success", progress: 4 })
    }, 1000)
    return () => window.clearTimeout(timeout)
  }, [setShared, shared.queue, signFlow])

  useEffect(() => {
    if (!annulFlow || annulFlow.stage !== "progress") return
    const timeout = window.setTimeout(() => {
      const next = annulFlow.progress + 1
      if (next < 3) {
        setAnnulFlow({ ...annulFlow, progress: next })
        return
      }
      const at = new Date().toISOString()
      const record = `0x${deterministicString(
        `${annulFlow.document.code}-anulacion`,
        "0123456789abcdef",
        64,
      )}`
      const historyEvent = {
        at,
        text: `Anulado por Ing. Carlos Mendoza Rivera. Motivo: ${annulFlow.reason}`,
      }
      const areaNotice: StoredNotice = {
        id: `area-annulled-${annulFlow.document.code}-${Date.now()}`,
        text: `El Director anuló el documento ${annulFlow.document.code}: ${annulFlow.reason}`,
        time: "ahora",
        tone: "red",
        icon: "reject",
        read: false,
        targetCode: annulFlow.document.code,
      }
      setShared((current) => ({
        ...current,
        registry: current.registry.map((document) =>
          document.code === annulFlow.document.code
            ? {
                ...document,
                deliveryStatus: "annulled",
                annulledAt: at,
                annulmentReason: annulFlow.reason,
                annulmentRecord: record,
                history: [...(document.history ?? []), historyEvent],
              }
            : document,
        ),
        documents: current.documents.map((document) =>
          document.code === annulFlow.document.code
            ? { ...document, status: "Anulado" }
            : document,
        ),
        cases: current.cases.map((document) =>
          document.code === annulFlow.document.code
            ? {
                ...document,
                status: "Anulado",
                history: [...document.history, historyEvent],
              }
            : document,
        ),
        notifications: {
          ...current.notifications,
          area:
            annulFlow.document.registeredBy === "Rosa Quispe Huamán"
              ? [areaNotice, ...current.notifications.area]
              : current.notifications.area,
        },
        metrics: {
          ...current.metrics,
          consultationReady:
            current.metrics.consultationReady -
            (annulFlow.document.deliveryStatus === "ready" ? 1 : 0),
        },
      }))
      setAnnulFlow({ ...annulFlow, stage: "success", progress: 3 })
    }, 1000)
    return () => window.clearTimeout(timeout)
  }, [annulFlow, setShared])

  function navigate(label: string) {
    setActiveItem(label)
    setNoticesOpen(false)
    setReviewItemId(null)
    if (role === "area") {
      if (label === "Inicio") setAreaPage("home")
      if (label === "Mis documentos") setAreaPage("documents")
      if (label === "Nuevo documento") setAreaPage("new")
    }
    if (role === "consulta") {
      if (label === "Inicio") setConsultationPage("home")
      if (label === "Buscar documentos") setConsultationPage("search")
    }
  }

  function goToAreaPage(page: AreaPage) {
    setAreaPage(page)
    setActiveItem(
      page === "home"
        ? "Inicio"
        : [
              "documents",
              "detail",
              "correct-individual",
              "correct-lot",
              "reissue",
            ].includes(page)
          ? "Mis documentos"
          : "Nuevo documento",
    )
    setNoticesOpen(false)
  }

  function openAreaDocument(document: AreaDocument) {
    const record = shared.cases.find((item) => item.code === document.code)
    setSelectedAreaCode(document.code)
    if (record?.status === "Observado") {
      setCorrectionEvent(record.event ?? initialEventData)
      setCorrectionBeneficiaries(
        (record.beneficiaries ?? []).map((person) => ({ ...person })),
      )
      setCorrectionDraft({
        id: 1,
        names: record.names,
        surnames: record.surnames,
        dni: record.dni,
      })
      goToAreaPage(
        record.beneficiaries ? "correct-lot" : "correct-individual",
      )
      return
    }
    goToAreaPage("detail")
  }

  function resendIndividual(record: CaseRecord, draft: Beneficiary) {
    const now = new Date().toISOString()
    const changes = [
      record.names !== draft.names
        ? `Nombres: ${record.names} → ${draft.names}`
        : "",
      record.surnames !== draft.surnames
        ? `Apellidos: ${record.surnames} → ${draft.surnames}`
        : "",
      record.dni !== draft.dni ? `DNI: ${record.dni} → ${draft.dni}` : "",
    ].filter(Boolean)
    const updatedHistory = [
      ...record.history,
      {
        at: now,
        text: `Corregido por Rosa Quispe Huamán${
          changes.length ? ` – ${changes.join(", ")}` : ""
        }`,
      },
      { at: now, text: "Reenviado a revisión" },
    ]
    const beneficiary = `${draft.names} ${draft.surnames}`.trim()
    const queueItem: DirectorItem = {
      id: record.code,
      code: record.code,
      type: record.type,
      beneficiary,
      dni: draft.dni,
      area: record.area,
      submittedBy: "Rosa Quispe Huamán",
      submittedDate: signedDateOnly(now),
      reviewed: false,
      corrected: true,
      certificateTitle: record.certificateTitle,
      certificateText: record.event
        ? `Por haber participado en el taller de capacitación '${record.event.name}', realizado del ${formatCertificateDateRange(record.event.startDate, record.event.endDate)} en el ${record.event.place}, con una duración de ${record.event.duration}.`
        : record.certificateText,
      event: record.event,
      expediente: record.expediente,
      lotCode: record.lotCode,
      history: updatedHistory,
      reissue: record.reissue,
    }
    setShared((current) => ({
      ...current,
      queue: [...current.queue, queueItem],
      documents: current.documents.map((document) =>
        document.code === record.code
          ? { ...document, beneficiary, status: "Pendiente" }
          : document,
      ),
      cases: current.cases.map((item) =>
        item.code === record.code
          ? {
              ...item,
              beneficiary,
              names: draft.names,
              surnames: draft.surnames,
              dni: draft.dni,
              status: "Pendiente",
              history: updatedHistory,
            }
          : item,
      ),
      metrics: {
        ...current.metrics,
        areaObserved: current.metrics.areaObserved - 1,
        areaPending: current.metrics.areaPending + 1,
      },
    }))
    setToast("Documento reenviado a revisión")
    goToAreaPage("documents")
  }

  function resendLot(record: CaseRecord) {
    const now = new Date().toISOString()
    const updatedHistory = [
      ...record.history,
      { at: now, text: "Corregido por Rosa Quispe Huamán" },
      { at: now, text: "Reenviado a revisión" },
    ]
    const queueItem: DirectorItem = {
      id: record.code,
      code: record.code,
      type: record.type,
      beneficiary: `${record.code} – ${correctionEvent.name} – ${quantityText(
        correctionBeneficiaries.length,
        "certificado",
      )}`,
      area: correctionEvent.area,
      submittedBy: "Rosa Quispe Huamán",
      submittedDate: signedDateOnly(now),
      reviewed: false,
      corrected: true,
      certificateTitle: "CERTIFICADO",
      beneficiaries: correctionBeneficiaries.map((person) => ({ ...person })),
      event: { ...correctionEvent },
      history: updatedHistory,
    }
    setShared((current) => ({
      ...current,
      queue: [...current.queue, queueItem],
      documents: current.documents.map((document) =>
        document.code === record.code
          ? {
              ...document,
              beneficiary: `${correctionEvent.name} – ${quantityText(
                correctionBeneficiaries.length,
                "beneficiario",
              )}`,
              status: "Pendiente",
            }
          : document,
      ),
      cases: current.cases.map((item) =>
        item.code === record.code
          ? {
              ...item,
              event: { ...correctionEvent },
              beneficiaries: correctionBeneficiaries.map((person) => ({
                ...person,
              })),
              status: "Pendiente",
              history: updatedHistory,
            }
          : item,
      ),
      metrics: {
        ...current.metrics,
        areaObserved: current.metrics.areaObserved - 1,
        areaPending: current.metrics.areaPending + 1,
      },
    }))
    setToast("Lote reenviado a revisión")
    goToAreaPage("documents")
  }

  function openReissue(code: string) {
    const original = shared.registry.find(
      (document) =>
        document.code === code && document.deliveryStatus !== "annulled",
    )
    if (!original) return
    const [names, ...surnames] = original.beneficiary.split(" ")
    setReissueOriginalCode(code)
    setReissueDraft({
      id: 1,
      names,
      surnames: surnames.join(" "),
      dni: original.dni,
    })
    setReissueEvent({
      name: original.workshop ?? initialEventData.name,
      startDate: original.eventStart ?? initialEventData.startDate,
      endDate: original.eventEnd ?? initialEventData.endDate,
      duration: original.duration ?? initialEventData.duration,
      place: original.place ?? initialEventData.place,
      area: original.area,
    })
    setReissueReason("")
    goToAreaPage("reissue")
  }

  function submitReissue(
    original: RegistryDocument,
    draft: Beneficiary,
  ) {
    const now = new Date()
    const submittedAt = now.toISOString()
    const newCode =
      original.code === "DRA-2026-H5R8NZ"
        ? "DRA-2026-U7H3KW"
        : generatedDocumentCode(
            `${original.code}-reemision-${shared.documents.length}`,
          )
    const [originalNames, ...originalSurnames] =
      original.beneficiary.split(" ")
    const changes = [
      draft.names !== originalNames
        ? `Nombre: ${originalNames} → ${draft.names}`
        : "",
      draft.surnames !== originalSurnames.join(" ")
        ? `Apellido: ${originalSurnames.join(" ")} → ${draft.surnames}`
        : "",
      draft.dni !== original.dni
        ? `DNI: ${original.dni} → ${draft.dni}`
        : "",
      reissueEvent.name !== (original.workshop ?? initialEventData.name)
        ? `Taller: ${original.workshop ?? initialEventData.name} → ${reissueEvent.name}`
        : "",
      reissueEvent.startDate !==
      (original.eventStart ?? initialEventData.startDate)
        ? `Fecha de inicio: ${
            original.eventStart ?? initialEventData.startDate
          } → ${reissueEvent.startDate}`
        : "",
      reissueEvent.endDate !== (original.eventEnd ?? initialEventData.endDate)
        ? `Fecha de fin: ${
            original.eventEnd ?? initialEventData.endDate
          } → ${reissueEvent.endDate}`
        : "",
      reissueEvent.duration !==
      (original.duration ?? initialEventData.duration)
        ? `Duración: ${original.duration ?? initialEventData.duration} → ${reissueEvent.duration}`
        : "",
      reissueEvent.place !== (original.place ?? initialEventData.place)
        ? `Lugar: ${original.place ?? initialEventData.place} → ${reissueEvent.place}`
        : "",
      reissueEvent.area !== original.area
        ? `Área: ${original.area} → ${reissueEvent.area}`
        : "",
    ].filter(Boolean)
    const beneficiary = `${draft.names} ${draft.surnames}`.trim()
    const history: WorkflowHistory[] = [
      {
        at: submittedAt,
        text: `Registrado por Rosa Quispe Huamán (Área de Capacitación) – Reemisión de ${original.code}`,
      },
      { at: submittedAt, text: "Enviado a revisión" },
    ]
    const queueItem: DirectorItem = {
      id: newCode,
      code: newCode,
      type: original.type,
      beneficiary,
      dni: draft.dni,
      expediente: original.expediente,
      lotCode: original.lotCode,
      area: original.area,
      submittedBy: "Rosa Quispe Huamán",
      submittedDate: signedDateOnly(submittedAt),
      reviewed: false,
      certificateTitle: original.certificateTitle,
      certificateText: `Por haber participado en el taller de capacitación '${reissueEvent.name}', realizado del ${formatCertificateDateRange(reissueEvent.startDate, reissueEvent.endDate)} en el ${reissueEvent.place}, con una duración de ${reissueEvent.duration}.`,
      event: { ...reissueEvent },
      history,
      reissue: {
        originalCode: original.code,
        reason: reissueReason,
        changes,
      },
    }
    setShared((current) => ({
      ...current,
      queue: [...current.queue, queueItem],
      documents: [
        {
          code: newCode,
          type: original.type,
          beneficiary,
          date: signedDateOnly(submittedAt),
          status: "Pendiente",
        },
        ...current.documents,
      ],
      registry: current.registry.map((document) =>
        document.code === original.code
          ? {
              ...document,
              history: [
                ...(document.history ?? []),
                {
                  at: submittedAt,
                  text: `Reemisión solicitada por Rosa Quispe Huamán – Motivo: ${reissueReason}`,
                },
              ],
            }
          : document,
      ),
      metrics: {
        ...current.metrics,
        areaPending: current.metrics.areaPending + 1,
      },
    }))
    setToast("Reemisión enviada a revisión")
    goToAreaPage("documents")
  }

  function submitBatch() {
    const now = new Date()
    const today = `${String(now.getDate()).padStart(2, "0")}/${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}/${now.getFullYear()}`
    const existingNumbers = [
      ...shared.documents.map((document) => document.code),
      ...shared.queue.map((item) => item.code),
    ]
      .map((code) => /^Lote 2026-(\d+)$/.exec(code)?.[1])
      .filter(Boolean)
      .map(Number)
    const nextNumber = Math.max(7, ...existingNumbers) + 1
    const code = `Lote 2026-${String(nextNumber).padStart(3, "0")}`
    const queueItem: DirectorItem = {
      id: code,
      code,
      type: "Certificado de Capacitación",
      beneficiary: `${code} – ${eventData.name} – ${quantityText(
        beneficiaries.length,
        "certificado",
      )}`,
      area: eventData.area,
      submittedBy: "Rosa Quispe Huamán",
      submittedDate: today,
      reviewed: false,
      certificateTitle: "CERTIFICADO",
      beneficiaries: beneficiaries.map((beneficiary) => ({ ...beneficiary })),
      event: { ...eventData },
    }
    setShared((current) => ({
      ...current,
      documents: [
        {
          code,
          type: "Certificado de Capacitación",
          beneficiary: `${eventData.name} – ${quantityText(
            beneficiaries.length,
            "beneficiario",
          )}`,
          date: today,
          status: "Pendiente",
          batch: true,
        },
        ...current.documents,
      ],
      queue: [...current.queue, queueItem],
      metrics: {
        ...current.metrics,
        areaPending: current.metrics.areaPending + 1,
      },
    }))
    setModalOpen(false)
    setDocumentFilter("Todos")
    setEventData({ ...initialEventData })
    setBeneficiaries([])
    goToAreaPage("documents")
    setToast(
      `¡Listo! ${
        beneficiaries.length === 1 ? "Se envió" : "Se enviaron"
      } ${quantityText(
        beneficiaries.length,
        "certificado",
      )} a revisión (${code})`,
    )
  }

  function openReview(item: DirectorItem) {
    setShared((current) => ({
      ...current,
      queue: current.queue.map((queueItem) =>
        queueItem.id === item.id
          ? {
              ...queueItem,
              reviewed: true,
              reviewedAt: queueItem.reviewedAt ?? new Date().toISOString(),
            }
          : queueItem,
      ),
    }))
    setReviewItemId(item.id)
    setActiveBeneficiary(0)
    setCheckedBeneficiaries([])
  }

  function startSigning(ids: string[]) {
    const items = shared.queue.filter((item) => ids.includes(item.id))
    const failedItems =
      items.length > 1 && !shared.luciaFailedOnce
        ? items.filter((item) => item.id === "DRA-2026-F8R2MA")
        : []
    const failedIds = failedItems.map((item) => item.id)
    const count = items.reduce(
      (total, item) => total + (item.beneficiaries?.length ?? 1),
      0,
    )
    const successfulItems = items.filter((item) => !failedIds.includes(item.id))
    const successfulCount = successfulItems.reduce(
      (total, item) => total + (item.beneficiaries?.length ?? 1),
      0,
    )
    const onlyItem = items.length === 1 ? items[0] : null
    const detail = failedIds.length
      ? `${successfulItems.length} elementos firmados`
      : onlyItem
        ? onlyItem.beneficiaries
          ? `${onlyItem.code} – ${onlyItem.event?.name}`
          : `${onlyItem.type} – ${onlyItem.beneficiary} – ${onlyItem.code}`
        : `${items.length} elementos en firma múltiple`
    const successText = failedIds.length
      ? `${
          successfulItems.length === 1 ? "Se firmó" : "Se firmaron"
        } ${quantityText(successfulItems.length, "documento")}`
      : onlyItem?.reissue
        ? "Se firmó 1 documento"
        : onlyItem && !onlyItem.beneficiaries
        ? `Se firmó 1 ${
            onlyItem.certificateTitle === "CONSTANCIA"
              ? "constancia"
              : "certificado"
          }`
        : `${
            successfulCount === 1 ? "Se firmó" : "Se firmaron"
          } ${quantityText(successfulCount, "certificado")}`
    const actionLabel =
      onlyItem?.reissue
        ? "Firmar 1 documento"
        : onlyItem && !onlyItem.beneficiaries
        ? `Firmar 1 ${
            onlyItem.certificateTitle === "CONSTANCIA"
              ? "constancia"
              : "certificado"
          }`
        : `Firmar ${quantityText(count, "certificado")}`
    setSignFlow({
      ids,
      failedIds,
      count,
      actionLabel,
      stage: "confirm",
      progress: 0,
      detail,
      successText,
      failureText: failedIds.length
        ? "1 documento no pudo prepararse y volvió a Por revisar: Certificado de Trabajo – Lucía Paredes Quinto. Puede intentarlo nuevamente."
        : undefined,
      returnText:
        onlyItem?.observedReturned
          ? `${onlyItem.observedReturned} ${
              onlyItem.observedReturned === 1
                ? "certificado fue observado"
                : "certificados fueron observados"
            } y devuelto al área`
          : undefined,
      replacementTexts: successfulItems
        .filter((item) => item.reissue)
        .map(
          (item) =>
            `El documento original ${item.reissue!.originalCode} fue anulado y reemplazado.`,
        ),
    })
  }

  function confirmReason() {
    if (!reasonAction || !reviewItemId) return
    const affectedItem = shared.queue.find((item) => item.id === reviewItemId)
    if (!affectedItem) return
    const actionAt = new Date().toISOString()
    if (reasonAction === "observe-selected") {
      const selectedPeople = (affectedItem.beneficiaries ?? []).filter(
        (person) => checkedBeneficiaries.includes(person.id),
      )
      const remainingPeople = (affectedItem.beneficiaries ?? []).filter(
        (person) => !checkedBeneficiaries.includes(person.id),
      )
      const event = affectedItem.event ?? initialEventData
      const newCases: CaseRecord[] = selectedPeople.map((person) => {
        const fullName = `${person.names} ${person.surnames}`
        return {
          code:
            affectedItem.code === "Lote 2026-007"
              ? lot007Codes[fullName]
              : generatedDocumentCode(`${affectedItem.code}-${fullName}`),
          type: affectedItem.type,
          beneficiary: fullName,
          names: person.names,
          surnames: person.surnames,
          dni: person.dni,
          area: affectedItem.area,
          submittedBy: affectedItem.submittedBy,
          submittedDate: affectedItem.submittedDate,
          status: "Observado",
          certificateTitle: "CERTIFICADO",
          certificateText: `Por haber participado en el taller de capacitación '${event.name}', realizado del ${formatCertificateDateRange(event.startDate, event.endDate)} en el ${event.place}, con una duración de ${event.duration}.`,
          lotCode: affectedItem.code,
          event,
          reason,
          actionAt,
          history: [
            {
              at:
                affectedItem.code === "Lote 2026-007"
                  ? "2026-10-07T08:40:00"
                  : isoFromDisplayDate(
                      affectedItem.submittedDate,
                      "08:30",
                    ),
              text: `Registrado por ${affectedItem.submittedBy} (${affectedItem.area})`,
            },
            {
              at:
                affectedItem.code === "Lote 2026-007"
                  ? "2026-10-07T08:52:00"
                  : isoFromDisplayDate(
                      affectedItem.submittedDate,
                      "08:45",
                    ),
              text: "Enviado a revisión",
            },
            {
              at: affectedItem.reviewedAt ?? actionAt,
              text: "Revisado por Ing. Carlos Mendoza Rivera",
            },
            {
              at: actionAt,
              text: `Observado por Ing. Carlos Mendoza Rivera – Motivo: ${reason}`,
            },
          ],
        }
      })
      const notice: StoredNotice = {
        id: `area-partial-${affectedItem.id}-${Date.now()}`,
        text: `El Director observó ${selectedPeople.length} ${
          selectedPeople.length === 1 ? "certificado" : "certificados"
        } del ${affectedItem.code}: ${reason}`,
        time: "ahora",
        tone: "orange",
        icon: "alert",
        read: false,
        targetCode: newCases[0]?.code,
      }
      setShared((current) => ({
        ...current,
        queue: current.queue.map((item) =>
          item.id === affectedItem.id
            ? {
                ...item,
                beneficiaries: remainingPeople,
                beneficiary: `${item.code} – ${event.name} – ${quantityText(
                  remainingPeople.length,
                  "certificado",
                )}`,
                reviewed: true,
                observedReturned:
                  (item.observedReturned ?? 0) + selectedPeople.length,
              }
            : item,
        ),
        documents: [
          ...newCases.map<AreaDocument>((record) => ({
            code: record.code,
            type: record.type,
            beneficiary: record.beneficiary,
            date: affectedItem.submittedDate,
            status: "Observado",
          })),
          ...current.documents.map((document) =>
            document.code === affectedItem.code
              ? {
                  ...document,
                  beneficiary: `${event.name} – ${quantityText(
                    remainingPeople.length,
                    "beneficiario",
                  )}`,
                }
              : document,
          ),
        ],
        cases: [...newCases, ...current.cases],
        notifications: {
          ...current.notifications,
          area: [notice, ...current.notifications.area],
        },
        metrics: {
          ...current.metrics,
          areaObserved:
            current.metrics.areaObserved + selectedPeople.length,
          directorObserved:
            current.metrics.directorObserved + selectedPeople.length,
        },
      }))
      setReasonAction(null)
      setReason("")
      setCheckedBeneficiaries([])
      setActiveBeneficiary(0)
      return
    }
    const rejection = reasonAction.startsWith("reject")
    const status: DocumentStatus = rejection ? "Rechazado" : "Observado"
    const isLot = reasonAction.endsWith("lot") || reasonAction === "observe-selected"
    const [firstName, ...surnameParts] = affectedItem.beneficiary.split(" ")
    const record: CaseRecord = {
      code: affectedItem.code,
      type: affectedItem.type,
      beneficiary: affectedItem.beneficiary,
      names: firstName,
      surnames: surnameParts.join(" "),
      dni: affectedItem.dni ?? "",
      area: affectedItem.area,
      submittedBy: affectedItem.submittedBy,
      submittedDate: affectedItem.submittedDate,
      status,
      certificateTitle: affectedItem.certificateTitle,
      certificateText: affectedItem.certificateText ?? "",
      expediente: affectedItem.expediente,
      event: affectedItem.event,
      beneficiaries: affectedItem.beneficiaries,
      reason,
      actionAt,
      history: [
        ...(affectedItem.history?.length
          ? affectedItem.history
          : [
              {
                at: isoFromDisplayDate(
                  affectedItem.submittedDate,
                  "08:30",
                ),
                text: `Registrado por ${affectedItem.submittedBy} (${affectedItem.area})`,
              },
              {
                at: isoFromDisplayDate(
                  affectedItem.submittedDate,
                  "08:45",
                ),
                text: "Enviado a revisión",
              },
              {
                at: affectedItem.reviewedAt ?? actionAt,
                text: "Revisado por Ing. Carlos Mendoza Rivera",
              },
            ]),
        {
          at: actionAt,
          text: `${rejection ? "Rechazado" : "Observado"} por Ing. Carlos Mendoza Rivera – Motivo: ${reason}`,
        },
      ],
      reissue: affectedItem.reissue,
    }
    const areaNotice: StoredNotice = {
      id: `area-${status}-${affectedItem.id}-${Date.now()}`,
      text: `El Director ${rejection ? "rechazó" : "observó"} ${
        isLot ? "el " : ""
      }${affectedItem.code}: ${reason}`,
      time: "ahora",
      tone: rejection ? "red" : "orange",
      icon: rejection ? "reject" : "alert",
      read: false,
      targetCode: affectedItem.code,
    }
    const rejectionNotice: StoredNotice | null =
      rejection && affectedItem.expediente
        ? {
            id: `consulta-rejected-${affectedItem.id}-${Date.now()}`,
            text: `Rechazo para comunicar al solicitante: ${affectedItem.type} – ${affectedItem.beneficiary} – ${affectedItem.expediente}. Motivo: ${reason}`,
            time: "ahora",
            tone: "red",
            icon: "reject",
            read: false,
            targetCode: affectedItem.code,
          }
        : null
    setShared((current) => ({
      ...current,
      queue: current.queue.filter((item) => item.id !== reviewItemId),
      documents: current.documents.map((document) =>
        document.code === reviewItemId ? { ...document, status } : document,
      ),
      cases: [
        record,
        ...current.cases.filter((item) => item.code !== record.code),
      ],
      notifications: {
        ...current.notifications,
        area:
          affectedItem.submittedBy === "Rosa Quispe Huamán"
            ? [areaNotice, ...current.notifications.area]
            : current.notifications.area,
        consulta: rejectionNotice
          ? [rejectionNotice, ...current.notifications.consulta]
          : current.notifications.consulta,
      },
      metrics: {
        ...current.metrics,
        areaPending:
          current.metrics.areaPending -
          (affectedItem.submittedBy === "Rosa Quispe Huamán" ? 1 : 0),
        areaObserved:
          current.metrics.areaObserved +
          (!rejection &&
          affectedItem.submittedBy === "Rosa Quispe Huamán"
            ? 1
            : 0),
        directorObserved:
          current.metrics.directorObserved + (rejection ? 0 : 1),
      },
    }))
    setSelectedQueue((current) =>
      current.filter((id) => id !== reviewItemId),
    )
    setReasonAction(null)
    setReason("")
    setReviewItemId(null)
    setActiveItem("Por revisar")
    setToast(
      `${isLot ? "Lote" : "Documento"} ${
        rejection ? "rechazado" : "observado"
      }. Se notificó al área.`,
    )
  }

  function printRegistryDocuments(documents: RegistryDocument[], lot = false) {
    const codes = documents.map((document) => document.code)
    const printedAt = new Date().toISOString()
    setShared((current) => {
      const affected = current.registry.filter((document) =>
        codes.includes(document.code),
      )
      const duplicateCount = affected.filter(
        (document) => document.prints.length > 0,
      ).length
      const shipmentKeys = [
        ...new Set(
          affected.map((document) => document.lotCode ?? document.code),
        ),
      ]
      const completedShipments = shipmentKeys.filter((shipment) => {
        const members = current.registry.filter(
          (document) => (document.lotCode ?? document.code) === shipment,
        )
        const wasComplete = members.every(
          (document) => document.prints.length > 0,
        )
        const willBeComplete = members.every(
          (document) =>
            document.prints.length > 0 || codes.includes(document.code),
        )
        return !wasComplete && willBeComplete
      }).length
      return {
        ...current,
        registry: current.registry.map((document) =>
          codes.includes(document.code)
            ? {
                ...document,
                deliveryStatus: "printed",
                prints: [
                  ...document.prints,
                  {
                    at: printedAt,
                    duplicate: document.prints.length > 0,
                  },
                ],
              }
            : document,
        ),
        metrics: {
          ...current.metrics,
          consultationReady:
            current.metrics.consultationReady - completedShipments,
          consultationPrinted:
            current.metrics.consultationPrinted + affected.length,
          consultationDuplicates:
            current.metrics.consultationDuplicates + duplicateCount,
        },
      }
    })
    setToast(
      lot
        ? `${
            documents.length === 1 ? "Se envió" : "Se enviaron"
          } ${quantityText(
            documents.length,
            "certificado",
          )} a impresión`
        : "Documento enviado a impresión",
    )
  }

  function handleNoticeClick(index: number) {
    const notice = shared.notifications[role][index]
    setShared((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [role]: current.notifications[role].map((item, itemIndex) =>
          itemIndex === index ? { ...item, read: true } : item,
        ),
      },
    }))
    setNoticesOpen(false)
    if (!notice) return
    if (role === "director") {
      const item = shared.queue.find(
        (queueItem) => queueItem.code === notice.targetCode,
      )
      setActiveItem("Por revisar")
      if (item) openReview(item)
      return
    }
    if (role === "area" && notice.targetCode) {
      const record = shared.cases.find(
        (item) => item.code === notice.targetCode,
      )
      setSelectedAreaCode(notice.targetCode)
      if (record?.status === "Observado") {
        setCorrectionDraft({
          id: 1,
          names: record.names,
          surnames: record.surnames,
          dni: record.dni,
        })
        setCorrectionEvent(record.event ?? initialEventData)
        setCorrectionBeneficiaries(
          (record.beneficiaries ?? []).map((person) => ({ ...person })),
        )
        goToAreaPage(
          record.beneficiaries ? "correct-lot" : "correct-individual",
        )
      } else {
        goToAreaPage("detail")
      }
      return
    }
    if (role === "consulta" && notice.targetCode) {
      setActiveItem("Buscar documentos")
      if (notice.targetCode.startsWith("Lote ")) {
        setConsultationPage("search")
        setConsultationQuery(notice.targetCode)
        setExpandedLots((current) =>
          current.includes(notice.targetCode!)
            ? current
            : [...current, notice.targetCode!],
        )
        return
      }
      const rejected = shared.cases.find(
        (record) =>
          record.code === notice.targetCode && record.status === "Rechazado",
      )
      if (rejected) {
        setSelectedRejectedCode(rejected.code)
        setConsultationPage("detail")
        return
      }
      const registryDocument = shared.registry.find(
        (document) => document.code === notice.targetCode,
      )
      if (registryDocument) {
        setSelectedRegistryCode(registryDocument.code)
        setSelectedRejectedCode(null)
        setConsultationPage("detail")
      }
    }
  }

  const areaTitle =
    areaPage === "home"
      ? "Inicio"
      : areaPage === "documents"
        ? "Mis documentos"
        : areaPage === "new"
          ? "Nuevo documento"
          : areaPage === "issue"
            ? "Certificado de Capacitación"
            : areaPage === "preview"
              ? "Vista previa"
              : areaPage === "detail"
                ? "Detalle del documento"
                : areaPage === "correct-lot"
                  ? "Corregir lote observado"
                  : areaPage === "reissue"
                    ? "Reemisión"
                    : "Corregir documento observado"

  const reviewItem = shared.queue.find((item) => item.id === reviewItemId)
  const selectedRegistryDocument = shared.registry.find(
    (document) => document.code === selectedRegistryCode,
  )
  const reissueOriginal = shared.registry.find(
    (document) => document.code === reissueOriginalCode,
  )
  const reissuePendingCodes = shared.queue
    .map((item) => item.reissue?.originalCode)
    .concat(
      shared.cases
        .filter(
          (record) =>
            record.reissue &&
            ["Observado", "Pendiente"].includes(record.status),
        )
        .map((record) => record.reissue?.originalCode),
    )
    .filter(Boolean) as string[]
  const annulledByLot = shared.registry.reduce<Record<string, number>>(
    (counts, document) => {
      if (document.lotCode && document.deliveryStatus === "annulled") {
        counts[document.lotCode] = (counts[document.lotCode] ?? 0) + 1
      }
      return counts
    },
    {},
  )
  const selectedRejectedRecord = shared.cases.find(
    (record) =>
      record.code === selectedRejectedCode && record.status === "Rechazado",
  )
  const selectedAreaRecord = (() => {
    if (!selectedAreaCode) return undefined
    const storedCase = shared.cases.find(
      (record) => record.code === selectedAreaCode,
    )
    if (storedCase) return storedCase
    const areaDocument = shared.documents.find(
      (document) => document.code === selectedAreaCode,
    )
    const queueItem = shared.queue.find((item) => item.code === selectedAreaCode)
    if (queueItem) {
      const [names, ...surnames] = queueItem.beneficiary.split(" ")
      return {
        code: queueItem.code,
        type: queueItem.type,
        beneficiary: queueItem.beneficiary,
        names,
        surnames: surnames.join(" "),
        dni: queueItem.dni ?? "",
        area: queueItem.area,
        submittedBy: queueItem.submittedBy,
        submittedDate: queueItem.submittedDate,
        status: areaDocument?.status ?? "Pendiente",
        certificateTitle: queueItem.certificateTitle,
        certificateText: queueItem.certificateText ?? "",
        expediente: queueItem.expediente,
        event: queueItem.event,
        beneficiaries: queueItem.beneficiaries,
        history: queueItem.history ?? [],
      } satisfies CaseRecord
    }
    const registryMatches = shared.registry.filter(
      (document) =>
        document.code === selectedAreaCode ||
        document.lotCode === selectedAreaCode,
    )
    if (registryMatches.length) {
      const first = registryMatches[0]
      const isLot = first.lotCode === selectedAreaCode
      const [names, ...surnames] = first.beneficiary.split(" ")
      return {
        code: selectedAreaCode,
        type: first.type,
        beneficiary: isLot
          ? quantityText(registryMatches.length, "beneficiario")
          : first.beneficiary,
        names,
        surnames: surnames.join(" "),
        dni: isLot ? "" : first.dni,
        area: first.area,
        submittedBy: first.registeredBy,
        submittedDate: signedDateOnly(first.submittedAt),
        status:
          first.deliveryStatus === "annulled" ? "Anulado" : "Firmado",
        certificateTitle: first.certificateTitle,
        certificateText: first.certificateText,
        expediente: first.expediente,
        lotCode: first.lotCode,
        event: first.workshop
          ? {
              name: first.workshop,
              startDate: first.eventStart ?? "",
              endDate: first.eventEnd ?? "",
              duration: first.duration ?? "",
              place: first.place ?? "",
              area: first.area,
            }
          : undefined,
        beneficiaries: isLot
          ? registryMatches.map((document, index) => {
              const [personNames, ...personSurnames] =
                document.beneficiary.split(" ")
              return {
                id: index + 1,
                names: personNames,
                surnames: personSurnames.join(" "),
                dni: document.dni,
              }
            })
          : undefined,
        history: [
          {
            at: first.registeredAt,
            text: `Registrado por ${first.registeredBy} (${first.area})`,
          },
          { at: first.submittedAt, text: "Enviado a revisión" },
          {
            at: first.reviewedAt,
            text: "Revisado por Ing. Carlos Mendoza Rivera",
          },
          ...(first.history ?? []).filter(
            (event) =>
              ![
                "Registrado por",
                "Enviado a revisión",
                "Revisado por",
                "Firmado por",
              ].some((prefix) => event.text.startsWith(prefix)),
          ),
          {
            at: first.signedAt,
            text: "Firmado por Ing. Carlos Mendoza Rivera",
          },
        ],
      } satisfies CaseRecord
    }
    if (!areaDocument) return undefined
    const [names, ...surnames] = areaDocument.beneficiary.split(" ")
    return {
      code: areaDocument.code,
      type: areaDocument.type,
      beneficiary: areaDocument.beneficiary,
      names,
      surnames: surnames.join(" "),
      dni: "",
      area: "Área de Capacitación",
      submittedBy: "Rosa Quispe Huamán",
      submittedDate: areaDocument.date,
      status: areaDocument.status,
      certificateTitle: "CERTIFICADO",
      certificateText: "",
      history: [],
    } satisfies CaseRecord
  })()
  const directorTitle = reviewItem
    ? reviewItem.beneficiaries
      ? `Revisión de lote – ${reviewItem.code}`
      : `Revisión – ${reviewItem.type}`
    : activeItem
  const consultationTitle =
    consultationPage === "home"
      ? "Inicio"
      : consultationPage === "search"
        ? "Buscar documentos"
        : consultationPage === "detail"
          ? "Detalle del documento"
          : "Documento final"

  let content
  if (role === "area") {
    if (areaPage === "home") {
      content = (
        <HomeContent config={config} onReview={() => navigate("Por revisar")} />
      )
    } else if (areaPage === "documents") {
      content = (
        <DocumentsContent
          documents={shared.documents}
          filter={documentFilter}
          onFilter={setDocumentFilter}
          onNew={() => goToAreaPage("new")}
          onOpen={openAreaDocument}
          annulledByLot={annulledByLot}
        />
      )
    } else if (areaPage === "new") {
      content = <NewDocumentContent onSelect={() => goToAreaPage("issue")} />
    } else if (areaPage === "issue") {
      content = (
        <IssueContent
          eventData={eventData}
          beneficiaries={beneficiaries}
          onEventChange={(key, value) =>
            setEventData((current) => ({ ...current, [key]: value }))
          }
          onBeneficiariesChange={setBeneficiaries}
          onContinue={() => goToAreaPage("preview")}
          onToast={setToast}
        />
      )
    } else if (areaPage === "preview") {
      content = (
        <PreviewContent
          eventData={eventData}
          beneficiaries={beneficiaries}
          modalOpen={modalOpen}
          onBack={() => goToAreaPage("issue")}
          onOpenModal={() => setModalOpen(true)}
          onCloseModal={() => setModalOpen(false)}
          onConfirm={submitBatch}
        />
      )
    } else if (areaPage === "detail" && selectedAreaRecord) {
      content = (
        <AreaReadOnlyDetail
          record={selectedAreaRecord}
          onBack={() => goToAreaPage("documents")}
          registry={shared.registry}
          reissuePendingCodes={reissuePendingCodes}
          onReissue={openReissue}
        />
      )
    } else if (areaPage === "reissue" && reissueOriginal && reissueDraft) {
      content = (
        <ReissueScreen
          original={reissueOriginal}
          draft={reissueDraft}
          eventData={reissueEvent}
          reason={reissueReason}
          onDraft={setReissueDraft}
          onEventData={setReissueEvent}
          onReason={setReissueReason}
          onCancel={() => goToAreaPage("detail")}
          onSubmit={() => submitReissue(reissueOriginal, reissueDraft)}
        />
      )
    } else if (
      areaPage === "correct-individual" &&
      selectedAreaRecord &&
      correctionDraft
    ) {
      content = (
        <IndividualCorrection
          record={selectedAreaRecord}
          draft={correctionDraft}
          onDraft={setCorrectionDraft}
          onCancel={() => goToAreaPage("documents")}
          onSubmit={() =>
            resendIndividual(selectedAreaRecord, correctionDraft)
          }
        />
      )
    } else if (areaPage === "correct-lot" && selectedAreaRecord) {
      content = (
        <LotCorrection
          record={selectedAreaRecord}
          eventData={correctionEvent}
          beneficiaries={correctionBeneficiaries}
          onEventData={setCorrectionEvent}
          onBeneficiaries={setCorrectionBeneficiaries}
          onCancel={() => goToAreaPage("documents")}
          onSubmit={() => resendLot(selectedAreaRecord)}
        />
      )
    } else {
      content = (
        <DocumentsContent
          documents={shared.documents}
          filter={documentFilter}
          onFilter={setDocumentFilter}
          onNew={() => goToAreaPage("new")}
          onOpen={openAreaDocument}
          annulledByLot={annulledByLot}
        />
      )
    }
  } else if (role === "director") {
    if (reviewItem?.beneficiaries) {
      content = (
        <LotReview
          item={reviewItem}
          activeIndex={activeBeneficiary}
          checkedBeneficiaries={checkedBeneficiaries}
          onActiveIndex={setActiveBeneficiary}
          onCheckBeneficiary={(id, checked) =>
            setCheckedBeneficiaries((current) =>
              checked
                ? [...current, id]
                : current.filter((currentId) => currentId !== id),
            )
          }
          onBack={() => setReviewItemId(null)}
          onReason={(action) => {
            setReason("")
            setReasonAction(action)
          }}
          onSign={() => startSigning([reviewItem.id])}
        />
      )
    } else if (reviewItem) {
      content = (
        <IndividualReview
          item={reviewItem}
          onBack={() => setReviewItemId(null)}
          onReason={(action) => {
            setReason("")
            setReasonAction(action)
          }}
          onSign={() => startSigning([reviewItem.id])}
        />
      )
    } else if (activeItem === "Inicio") {
      content = (
        <HomeContent
          config={config}
          onReview={() => navigate("Por revisar")}
        />
      )
    } else if (activeItem === "Por revisar") {
      content = (
        <ReviewQueue
          items={shared.queue}
          selected={selectedQueue}
          onSelect={(id, checked) =>
            setSelectedQueue((current) =>
              checked
                ? [...current, id]
                : current.filter((currentId) => currentId !== id),
            )
          }
          onOpen={openReview}
          onSign={() => startSigning(selectedQueue)}
        />
      )
    } else {
      content = (
        <SignedDocuments
          documents={shared.registry}
          search={signedSearch}
          onSearch={setSignedSearch}
          onAnnul={(document) =>
            setAnnulFlow({
              document,
              reason: "",
              stage: "reason",
              progress: 0,
            })
          }
        />
      )
    }
  } else {
    if (consultationPage === "home") {
      content = (
        <HomeContent config={config} onReview={() => undefined} />
      )
    } else if (consultationPage === "search") {
      content = (
        <ConsultationSearch
          documents={shared.registry}
          query={consultationQuery}
          filter={consultationFilter}
          expandedLots={expandedLots}
          onQuery={setConsultationQuery}
          onFilter={setConsultationFilter}
          onToggleLot={(lot) =>
            setExpandedLots((current) =>
              current.includes(lot)
                ? current.filter((item) => item !== lot)
                : [...current, lot],
            )
          }
          onOpen={(document) => {
            setSelectedRegistryCode(document.code)
            setSelectedRejectedCode(null)
            setTechnicalOpen(false)
            setConsultationPage("detail")
          }}
          onPrintLot={(documents) =>
            printRegistryDocuments(documents, true)
          }
        />
      )
    } else if (consultationPage === "detail" && selectedRejectedRecord) {
      content = (
        <AreaReadOnlyDetail
          record={selectedRejectedRecord}
          onBack={() => setConsultationPage("search")}
          backLabel="← Volver a Buscar documentos"
        />
      )
    } else if (consultationPage === "detail" && selectedRegistryDocument) {
      content = (
        <DocumentDetail
          document={selectedRegistryDocument}
          technicalOpen={technicalOpen}
          onTechnicalOpen={() => setTechnicalOpen((current) => !current)}
          onBack={() => setConsultationPage("search")}
          onView={() => setConsultationPage("final")}
          onDownload={() => setToast("Documento descargado")}
          onPrint={() =>
            printRegistryDocuments([selectedRegistryDocument])
          }
          onCopy={(value) => {
            navigator.clipboard?.writeText(value)
            setToast("Copiado")
          }}
        />
      )
    } else if (selectedRegistryDocument) {
      content = (
        <FinalDocument
          document={selectedRegistryDocument}
          onBack={() => setConsultationPage("detail")}
          onDownload={() => setToast("Documento descargado")}
          onPrint={() =>
            printRegistryDocuments([selectedRegistryDocument])
          }
        />
      )
    } else {
      content = (
        <ConsultationSearch
          documents={shared.registry}
          query={consultationQuery}
          filter={consultationFilter}
          expandedLots={expandedLots}
          onQuery={setConsultationQuery}
          onFilter={setConsultationFilter}
          onToggleLot={() => undefined}
          onOpen={() => undefined}
          onPrintLot={() => undefined}
        />
      )
    }
  }

  return (
    <div className="app-shell">
      <Sidebar config={config} activeItem={activeItem} onNavigate={navigate} />
      <div className="main-column">
        <Header
          config={config}
          title={
            role === "area"
              ? areaTitle
              : role === "director"
                ? directorTitle
                : consultationTitle
          }
          noticesOpen={noticesOpen}
          unreadCount={
            shared.notifications[role].filter((notice) => !notice.read).length
          }
          onToggleNotices={() => setNoticesOpen((value) => !value)}
          onReadAll={() =>
            setShared((current) => ({
              ...current,
              notifications: {
                ...current.notifications,
                [role]: current.notifications[role].map((notice) => ({
                  ...notice,
                  read: true,
                })),
              },
            }))
          }
          onNoticeClick={handleNoticeClick}
          onLogout={onLogout}
        />
        <main className="page-content">{content}</main>
      </div>
      {toast ? (
        <div className="toast" role="status">
          <CheckCircle2 />
          {toast}
        </div>
      ) : null}
      {reasonAction ? (
        <ReasonModal
          action={reasonAction}
          reason={reason}
          onReason={setReason}
          onCancel={() => {
            setReasonAction(null)
            setReason("")
          }}
          onConfirm={confirmReason}
        />
      ) : null}
      {signFlow ? (
        <SignatureModal
          flow={signFlow}
          onCancel={() => {
            setSignFlow(null)
            setToast(
              "Firma cancelada. Los documentos siguen pendientes de firma.",
            )
          }}
          onConfirm={() =>
            setSignFlow({ ...signFlow, stage: "progress", progress: 0 })
          }
          onFinish={() => {
            setSignFlow(null)
            setReviewItemId(null)
            setActiveItem("Por revisar")
          }}
        />
      ) : null}
      {annulFlow ? (
        <AnnulmentModal
          flow={annulFlow}
          onReason={(reason) => setAnnulFlow({ ...annulFlow, reason })}
          onCancel={() => {
            if (annulFlow.stage === "confirm") {
              setToast(
                "Anulación cancelada. El documento sigue vigente.",
              )
            }
            setAnnulFlow(null)
          }}
          onContinue={() =>
            setAnnulFlow({
              ...annulFlow,
              stage:
                annulFlow.stage === "reason" ? "confirm" : "progress",
              progress: 0,
            })
          }
          onFinish={() => {
            setAnnulFlow(null)
            setActiveItem("Documentos firmados")
          }}
        />
      ) : null}
    </div>
  )
}

export default function App() {
  const [role, setRole] = useState<RoleKey | null>(null)
  const [shared, setShared] = useSharedState()

  return role ? (
    <InternalApp
      role={role}
      onLogout={() => setRole(null)}
      shared={shared}
      setShared={setShared}
    />
  ) : (
    <LoginScreen onLogin={setRole} />
  )
}
