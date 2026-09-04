export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "closed"
  | "lost"

export type Lead = {
  id: string
  clientId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  companyName: string | null
  parkingSpaces: number | null
  hasAirportShuttle: boolean | null
  shuttleServiceWork: string | null
  averageDailyParkingRate: string | null
  status: LeadStatus
  sourcePage: string | null
  sourcePageUrl: string | null
  comments: string | null
  adminNotes: string | null
  createdAt: string
  updatedAt: string
}