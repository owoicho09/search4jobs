"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { updateProfileAction, type ProfileFormState } from "@/lib/profile/actions";

const initialState: ProfileFormState = {};

interface ProfileDefaults {
  fullName: string;
  headline: string;
  summary: string;
  skills: string[];
  experienceLevel: string | null;
  yearsExperience: number | null;
}

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, action, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      {state.success && <Alert variant="success">Profile saved.</Alert>}

      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={defaults.fullName} />
        <FieldError>{state.fieldErrors?.fullName}</FieldError>
      </div>

      <div>
        <Label htmlFor="headline">Headline / target role</Label>
        <Input id="headline" name="headline" placeholder="e.g. Senior Backend Engineer" defaultValue={defaults.headline} />
        <FieldError>{state.fieldErrors?.headline}</FieldError>
      </div>

      <div>
        <Label htmlFor="summary">Professional summary</Label>
        <Textarea id="summary" name="summary" defaultValue={defaults.summary} />
        <FieldError>{state.fieldErrors?.summary}</FieldError>
      </div>

      <div>
        <Label htmlFor="skills">Skills (comma separated)</Label>
        <Input id="skills" name="skills" defaultValue={defaults.skills.join(", ")} placeholder="React, TypeScript, SQL" />
        <FieldError>{state.fieldErrors?.skills}</FieldError>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="experienceLevel">Experience level</Label>
          <Select id="experienceLevel" name="experienceLevel" defaultValue={defaults.experienceLevel ?? ""}>
            <option value="">Not set</option>
            <option value="entry">Entry</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
            <option value="executive">Executive</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="yearsExperience">Years of experience</Label>
          <Input
            id="yearsExperience"
            name="yearsExperience"
            type="number"
            min={0}
            max={60}
            defaultValue={defaults.yearsExperience ?? ""}
          />
          <FieldError>{state.fieldErrors?.yearsExperience}</FieldError>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
