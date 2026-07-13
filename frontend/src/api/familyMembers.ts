import type { FamilyMember } from '../widgets/widgetHostModels'
import { fetchApi } from './request'

const normalizeMember = (value: unknown): FamilyMember | null => {
  const candidate = value as {
    id?: unknown
    firstName?: unknown
    color?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.firstName !== 'string' ||
    typeof candidate.color !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    firstName: candidate.firstName,
    color: candidate.color,
  }
}

export const fetchFamilyMembers = async () => {
  const response = await fetchApi('/family-members')

  if (!response.ok) {
    throw new Error('Failed to load family members from backend.')
  }

  const payload = (await response.json()) as { familyMembers?: unknown[] }

  return (payload.familyMembers ?? [])
    .map(normalizeMember)
    .filter((member): member is FamilyMember => Boolean(member))
}

export const createFamilyMember = async (input: {
  firstName: string
  color: string
}) => {
  const response = await fetchApi('/family-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('Failed to create family member in backend.')
  }

  const payload = (await response.json()) as { familyMember?: unknown }
  const familyMember = normalizeMember(payload.familyMember)

  if (!familyMember) {
    throw new Error('Backend returned an invalid family member payload.')
  }

  return familyMember
}

export const updateFamilyMember = async (
  memberId: string,
  input: { firstName?: string; color?: string },
) => {
  const response = await fetchApi(`/family-members/${memberId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('Failed to update family member in backend.')
  }

  const payload = (await response.json()) as { familyMember?: unknown }
  const familyMember = normalizeMember(payload.familyMember)

  if (!familyMember) {
    throw new Error('Backend returned an invalid family member payload.')
  }

  return familyMember
}

export const deleteFamilyMember = async (memberId: string) => {
  const response = await fetchApi(`/family-members/${memberId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete family member in backend.')
  }
}