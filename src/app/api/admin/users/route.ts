import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Helper: Normalize phone numbers for duplicate detection
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '');
}

// Helper: RFC 5322 compliant email validator
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

/**
 * GET /api/admin/users
 * Returns list of all profiles with their driver, assigned vehicle, and auth status
 */
export async function GET() {
  try {
    const admin = getSupabaseAdmin();

    const [
      { data: profiles, error: profErr },
      { data: drivers, error: drivErr },
      { data: vehicles, error: vehErr },
      { data: rateVehicles, error: rateVehErr },
      { data: authUsers, error: authErr },
    ] = await Promise.all([
      admin.from('profiles').select('*').order('created_at', { ascending: false }),
      admin.from('drivers').select('*'),
      admin.from('vehicles').select('*'),
      admin.from('rate_vehicle_types').select('*').order('display_order', { ascending: true }),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (profErr) {
      return NextResponse.json({ success: false, error: profErr.message }, { status: 500 });
    }

    // Build auth user lookup map for verified email & phone status
    const authMap = new Map<string, { email_confirmed_at?: string | null; phone_confirmed_at?: string | null }>();
    if (!authErr && authUsers?.users) {
      for (const u of authUsers.users) {
        authMap.set(u.id, {
          email_confirmed_at: u.email_confirmed_at,
          phone_confirmed_at: u.phone_confirmed_at,
        });
      }
    }

    const driverMap = new Map<string, any>();
    if (!drivErr && drivers) {
      for (const d of drivers) {
        driverMap.set(d.id, d);
      }
    }

    const vehicleMap = new Map<string, any>();
    if (!vehErr && vehicles) {
      for (const v of vehicles) {
        vehicleMap.set(v.id, v);
      }
    }

    const rateVehicleMap = new Map<string, any>();
    if (!rateVehErr && rateVehicles) {
      for (const rv of rateVehicles) {
        rateVehicleMap.set(rv.id, rv);
      }
    }

    // Merge profiles with driver and vehicle information
    const enrichedUsers = (profiles || []).map((p) => {
      const authInfo = authMap.get(p.id);
      const isEmailVerified = p.email_verified || Boolean(authInfo?.email_confirmed_at);
      const isPhoneVerified = p.phone_verified || Boolean(authInfo?.phone_confirmed_at);

      const driverInfo = driverMap.get(p.id);
      let assignedVehicle = null;
      if (driverInfo?.assigned_vehicle_id) {
        const rateVeh = rateVehicleMap.get(driverInfo.assigned_vehicle_id);
        if (rateVeh) {
          assignedVehicle = {
            id: rateVeh.id,
            plate_number: rateVeh.category.toUpperCase(),
            make: rateVeh.name,
            model: `(${rateVeh.seating_capacity} Seats)`,
            vehicle_type: rateVeh.category,
            seating_capacity: rateVeh.seating_capacity,
            luggage_capacity: rateVeh.luggage_capacity,
            is_active: rateVeh.is_active,
            status: rateVeh.is_active ? 'assigned' : 'inactive',
            is_from_rates: true,
          };
        } else {
          assignedVehicle = vehicleMap.get(driverInfo.assigned_vehicle_id) || null;
        }
      }

      return {
        ...p,
        email_verified: isEmailVerified,
        phone_verified: isPhoneVerified,
        driver_details: driverInfo
          ? {
              license_number: driverInfo.license_number,
              national_id: driverInfo.national_id,
              assigned_vehicle_id: driverInfo.assigned_vehicle_id,
              assigned_vehicle: assignedVehicle,
              driver_status: driverInfo.status,
              rating: driverInfo.rating,
              total_rides: driverInfo.total_rides,
              total_earnings: driverInfo.total_earnings,
              cash_collected: driverInfo.cash_collected,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      total: enrichedUsers.length,
      rateVehicles: rateVehicles || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch users';
    console.error('[GET /api/admin/users] Error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Creates a new user in Supabase Auth and database with duplicate prevention
 */
export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const {
      full_name,
      email,
      phone,
      role = 'customer',
      status = 'active',
      email_verified = true,
      password,
      license_number,
      national_id,
      assigned_vehicle_id,
      avatar_url,
    } = body;

    // 1. Basic validation
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Full legal name is required (minimum 2 characters).' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
      return NextResponse.json(
        { success: false, error: 'A valid contact phone number is required (minimum 7 digits).' },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'dispatcher', 'driver', 'customer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role specified. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const normalizedPhone = normalizePhone(cleanPhone);

    // 2. Prevent Duplicate Emails in profiles and auth.users
    const { data: existingEmailUser } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingEmailUser) {
      return NextResponse.json(
        {
          success: false,
          error: `The email address "${cleanEmail}" is already registered to user "${existingEmailUser.full_name}". Duplicate emails are prohibited.`,
        },
        { status: 400 }
      );
    }

    // 3. Prevent Duplicate Phone Numbers in profiles
    const { data: allProfiles } = await admin
      .from('profiles')
      .select('id, full_name, phone')
      .not('phone', 'is', null);

    if (allProfiles) {
      const duplicatePhoneUser = allProfiles.find(
        (p) => p.phone && normalizePhone(p.phone) === normalizedPhone
      );
      if (duplicatePhoneUser) {
        return NextResponse.json(
          {
            success: false,
            error: `The phone number "${cleanPhone}" is already assigned to user "${duplicatePhoneUser.full_name}". Duplicate phone numbers are prohibited.`,
          },
          { status: 400 }
        );
      }
    }

    // 4. Role specific checks (Driver)
    if (role === 'driver') {
      if (!license_number || typeof license_number !== 'string' || license_number.trim().length < 3) {
        return NextResponse.json(
          { success: false, error: 'A valid commercial driving license number is required for drivers.' },
          { status: 400 }
        );
      }

      // Check unique license number
      const { data: existingDriverWithLicense } = await admin
        .from('drivers')
        .select('id, license_number')
        .ilike('license_number', license_number.trim())
        .maybeSingle();

      if (existingDriverWithLicense) {
        return NextResponse.json(
          {
            success: false,
            error: `Driving license "${license_number.trim()}" is already registered in the fleet system.`,
          },
          { status: 400 }
        );
      }

      // Check vehicle assignment availability from Rates module
      if (assigned_vehicle_id) {
        const { data: targetRateVehicle, error: rateVehErr } = await admin
          .from('rate_vehicle_types')
          .select('*')
          .eq('id', assigned_vehicle_id)
          .maybeSingle();

        if (rateVehErr || !targetRateVehicle) {
          return NextResponse.json(
            { success: false, error: 'The selected vehicle does not exist in the Rates module.' },
            { status: 400 }
          );
        }

        if (!targetRateVehicle.is_active) {
          return NextResponse.json(
            {
              success: false,
              error: `Vehicle "${targetRateVehicle.name}" is currently inactive in the Rates module and cannot be assigned.`,
            },
            { status: 400 }
          );
        }

        // Check if vehicle is already assigned to an active driver
        const { data: vehicleCurrentDriver } = await admin
          .from('drivers')
          .select('id, profile:profiles(full_name)')
          .eq('assigned_vehicle_id', assigned_vehicle_id)
          .maybeSingle();

        if (vehicleCurrentDriver) {
          const currentDriverName = (vehicleCurrentDriver.profile as any)?.full_name || 'another captain';
          return NextResponse.json(
            {
              success: false,
              error: `Vehicle "${targetRateVehicle.name}" (${targetRateVehicle.category.toUpperCase()}) is currently assigned to ${currentDriverName}. Reassign or unassign that vehicle before allocating it here.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // 5. Create Auth User in Supabase
    // If no password provided, generate a secure random temporary password
    const userPassword =
      password && typeof password === 'string' && password.trim().length >= 6
        ? password.trim()
        : 'AlHarmain@' + Math.floor(100000 + Math.random() * 900000);

    const { data: authCreated, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: userPassword,
      email_confirm: Boolean(email_verified),
      phone: cleanPhone,
      phone_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role,
        phone: cleanPhone,
      },
    });

    if (authError || !authCreated?.user) {
      console.error('[POST /api/admin/users] Auth createUser error:', authError);
      return NextResponse.json(
        {
          success: false,
          error: authError?.message || 'Failed to create user account in authentication system.',
        },
        { status: 400 }
      );
    }

    const newUserId = authCreated.user.id;

    // 6. Upsert public.profiles record
    const { data: newProfile, error: profileErr } = await admin
      .from('profiles')
      .upsert({
        id: newUserId,
        role,
        full_name: full_name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        avatar_url: avatar_url ? String(avatar_url).trim() : null,
        email_verified: Boolean(email_verified),
        phone_verified: true,
        status: status === 'suspended' || status === 'deactivated' ? status : 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (profileErr) {
      console.error('[POST /api/admin/users] Profile upsert error:', profileErr);
    }

    // 7. Role specific database entries
    let createdDriver = null;
    if (role === 'driver') {
      const isDriverActive = status !== 'suspended' && status !== 'deactivated';
      const driverRecord = {
        id: newUserId,
        license_number: license_number.trim(),
        national_id: national_id?.trim() || null,
        assigned_vehicle_id: assigned_vehicle_id || null,
        status: !isDriverActive
          ? 'unavailable'
          : assigned_vehicle_id
          ? 'assigned'
          : 'available',
        rating: 5.0,
        total_rides: 0,
        total_earnings: 0,
        cash_collected: 0,
        avatar_url: avatar_url ? String(avatar_url).trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: dData, error: dErr } = await admin
        .from('drivers')
        .upsert(driverRecord)
        .select('*')
        .single();

      if (dErr) {
        console.error('[POST /api/admin/users] Driver insert error:', dErr);
      } else {
        createdDriver = dData;
      }


    } else if (role === 'customer') {
      try {
        await admin
          .from('customers')
          .upsert({ id: newUserId, preferred_language: 'en', created_at: new Date().toISOString() });
      } catch {
        // Non-critical if customer profile table insert fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account for "${full_name.trim()}" created successfully.`,
      user: newProfile || {
        id: newUserId,
        role,
        full_name: full_name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        email_verified: Boolean(email_verified),
        status,
      },
      driver: createdDriver,
      generatedPassword: password ? undefined : userPassword,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error while creating user';
    console.error('[POST /api/admin/users] Error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 * Updates an existing user's details, role, status, email verification, or vehicle assignment
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const body = await req.json().catch(() => ({}));

    const {
      userId,
      full_name,
      email,
      phone,
      role,
      status,
      email_verified,
      phone_verified,
      license_number,
      national_id,
      assigned_vehicle_id,
      password,
      avatar_url,
    } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ success: false, error: 'userId is required for updates.' }, { status: 400 });
    }

    const uid = userId.trim();

    // Check user exists
    const { data: existingProfile, error: fetchErr } = await admin
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (fetchErr || !existingProfile) {
      return NextResponse.json({ success: false, error: 'User profile not found.' }, { status: 404 });
    }

    // 1. Duplicate email check if changed
    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
      }

      if (cleanEmail !== existingProfile.email?.toLowerCase()) {
        const { data: duplicateEmail } = await admin
          .from('profiles')
          .select('id, full_name')
          .ilike('email', cleanEmail)
          .neq('id', uid)
          .maybeSingle();

        if (duplicateEmail) {
          return NextResponse.json(
            {
              success: false,
              error: `Email "${cleanEmail}" is already registered to user "${duplicateEmail.full_name}".`,
            },
            { status: 400 }
          );
        }
      }
    }

    // 2. Duplicate phone check if changed
    if (phone && typeof phone === 'string') {
      const cleanPhone = phone.trim();
      const normNewPhone = normalizePhone(cleanPhone);
      const normOldPhone = existingProfile.phone ? normalizePhone(existingProfile.phone) : '';

      if (normNewPhone !== normOldPhone) {
        const { data: allProfiles } = await admin
          .from('profiles')
          .select('id, full_name, phone')
          .neq('id', uid)
          .not('phone', 'is', null);

        if (allProfiles) {
          const duplicatePhone = allProfiles.find(
            (p) => p.phone && normalizePhone(p.phone) === normNewPhone
          );
          if (duplicatePhone) {
            return NextResponse.json(
              {
                success: false,
                error: `Phone number "${cleanPhone}" is already assigned to user "${duplicatePhone.full_name}".`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // 3. Driver vehicle assignment logic & conflict resolution
    const effectiveRole = role || existingProfile.role;
    if (effectiveRole === 'driver') {
      const { data: currentDriver } = await admin
        .from('drivers')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      const previousVehicleId = currentDriver?.assigned_vehicle_id;

      // Handle license number uniqueness if provided and changed
      if (license_number && typeof license_number === 'string') {
        const cleanLic = license_number.trim();
        const { data: existingLicense } = await admin
          .from('drivers')
          .select('id')
          .ilike('license_number', cleanLic)
          .neq('id', uid)
          .maybeSingle();

        if (existingLicense) {
          return NextResponse.json(
            { success: false, error: `License number "${cleanLic}" is already registered to another driver.` },
            { status: 400 }
          );
        }
      }

      // Check if vehicle assignment is changing
      if (assigned_vehicle_id !== undefined) {
        const targetVehicleId = assigned_vehicle_id ? assigned_vehicle_id.trim() : null;

        if (targetVehicleId && targetVehicleId !== previousVehicleId) {
          // Verify vehicle exists in rate_vehicle_types
          const { data: targetRateVeh, error: vErr } = await admin
            .from('rate_vehicle_types')
            .select('*')
            .eq('id', targetVehicleId)
            .maybeSingle();

          if (vErr || !targetRateVeh) {
            return NextResponse.json(
              { success: false, error: 'Selected vehicle does not exist in the Rates module.' },
              { status: 400 }
            );
          }

          if (!targetRateVeh.is_active) {
            return NextResponse.json(
              {
                success: false,
                error: `Vehicle "${targetRateVeh.name}" is currently inactive in the Rates module and cannot be assigned.`,
              },
              { status: 400 }
            );
          }

          // Check if target vehicle is currently assigned to another driver
          const { data: existingDriverWithVeh } = await admin
            .from('drivers')
            .select('id, profile:profiles(full_name)')
            .eq('assigned_vehicle_id', targetVehicleId)
            .neq('id', uid)
            .maybeSingle();

          if (existingDriverWithVeh) {
            const driverName = (existingDriverWithVeh.profile as any)?.full_name || 'another driver';
            return NextResponse.json(
              {
                success: false,
                error: `Vehicle "${targetRateVeh.name}" (${targetRateVeh.category.toUpperCase()}) is already assigned to ${driverName}. Please unassign that driver first.`,
              },
              { status: 400 }
            );
          }
        }

        // Determine driver duty status based on account status & vehicle assignment
        let resolvedDriverStatus = targetVehicleId ? 'assigned' : 'available';
        if (status === 'deactivated' || status === 'suspended' || existingProfile.status === 'deactivated') {
          resolvedDriverStatus = 'unavailable';
        } else if (status === 'active') {
          resolvedDriverStatus = targetVehicleId ? 'assigned' : 'available';
        }

        // Upsert or update drivers row
        await admin.from('drivers').upsert({
          id: uid,
          license_number: license_number !== undefined ? license_number.trim() : currentDriver?.license_number || 'DL-PENDING',
          national_id: national_id !== undefined ? (national_id?.trim() || null) : currentDriver?.national_id,
          assigned_vehicle_id: targetVehicleId,
          status: resolvedDriverStatus,
          avatar_url: avatar_url !== undefined ? (avatar_url ? avatar_url.trim() : null) : currentDriver?.avatar_url,
          updated_at: new Date().toISOString(),
        });
      } else if (license_number !== undefined || national_id !== undefined || avatar_url !== undefined || status !== undefined) {
        let resolvedDriverStatus = currentDriver?.status || 'available';
        if (status === 'deactivated' || status === 'suspended') {
          resolvedDriverStatus = 'unavailable';
        } else if (status === 'active' && resolvedDriverStatus === 'unavailable') {
          resolvedDriverStatus = currentDriver?.assigned_vehicle_id ? 'assigned' : 'available';
        }

        await admin.from('drivers').upsert({
          id: uid,
          license_number: license_number !== undefined ? license_number.trim() : currentDriver?.license_number || 'DL-PENDING',
          national_id: national_id !== undefined ? (national_id?.trim() || null) : currentDriver?.national_id,
          assigned_vehicle_id: currentDriver?.assigned_vehicle_id ?? null,
          status: resolvedDriverStatus,
          avatar_url: avatar_url !== undefined ? (avatar_url ? avatar_url.trim() : null) : currentDriver?.avatar_url,
          updated_at: new Date().toISOString(),
        });
      }
    }

    // 4. Update profiles table
    const profileUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) profileUpdates.full_name = full_name.trim();
    if (email !== undefined) profileUpdates.email = email.trim().toLowerCase();
    if (phone !== undefined) profileUpdates.phone = phone.trim();
    if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url ? avatar_url.trim() : null;
    if (role !== undefined) profileUpdates.role = role;
    if (status !== undefined) profileUpdates.status = status;
    if (email_verified !== undefined) profileUpdates.email_verified = Boolean(email_verified);
    if (phone_verified !== undefined) profileUpdates.phone_verified = Boolean(phone_verified);

    const { data: updatedProfile, error: updateErr } = await admin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', uid)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[PATCH /api/admin/users] Profile update error:', updateErr);
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // 5. Update Auth system credentials if needed (UUID users only)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
    if (isUuid) {
      const authUpdates: Record<string, any> = {};
      if (email !== undefined) authUpdates.email = email.trim().toLowerCase();
      if (email_verified !== undefined) authUpdates.email_confirm = Boolean(email_verified);
      if (phone !== undefined) {
        authUpdates.phone = phone.trim();
        authUpdates.phone_confirm = true;
      }
      if (password && typeof password === 'string' && password.trim().length >= 6) {
        authUpdates.password = password.trim();
      }
      if (full_name !== undefined || role !== undefined) {
        authUpdates.user_metadata = {
          ...existingProfile,
          full_name: full_name ? full_name.trim() : existingProfile.full_name,
          role: role || existingProfile.role,
        };
      }

      if (Object.keys(authUpdates).length > 0) {
        await admin.auth.admin.updateUserById(uid, authUpdates).catch((e) => {
          console.warn('[PATCH /api/admin/users] Auth admin update warning:', e.message);
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `User "${updatedProfile.full_name}" updated successfully.`,
      user: updatedProfile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error while updating user';
    console.error('[PATCH /api/admin/users] Error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users
 * Removes user, unassigns any active vehicles, and calls RPC cascade
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, force = false } = body as { userId?: string; force?: boolean };

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return NextResponse.json({ success: false, error: 'userId is required.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const uid = userId.trim();

    // Check user's role and existing profile
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', uid)
      .maybeSingle();

    const userRole = targetProfile?.role || 'user';

    // 1. Check for active ongoing bookings before deleting
    let activeTrips: { id: string; booking_reference: string; status: string }[] | null = null;
    let countErr: any = null;

    if (userRole === 'driver') {
      const res = await admin
        .from('bookings')
        .select('id, booking_reference, status')
        .eq('assigned_driver_id', uid)
        .in('status', [
          'driver_assigned',
          'driver_accepted',
          'accepted',
          'driver_arriving',
          'on_the_way',
          'driver_arrived',
          'arrived',
          'trip_started',
          'started',
          'ride_started',
        ]);
      activeTrips = res.data;
      countErr = res.error;
    } else if (userRole === 'customer') {
      const res = await admin
        .from('bookings')
        .select('id, booking_reference, status')
        .eq('customer_id', uid)
        .in('status', [
          'pending_review',
          'pending_verification',
          'pending',
          'confirmed',
          'driver_assigned',
          'driver_accepted',
          'accepted',
          'driver_arriving',
          'on_the_way',
          'driver_arrived',
          'arrived',
          'trip_started',
          'started',
          'ride_started',
        ]);
      activeTrips = res.data;
      countErr = res.error;
    }

    const activeCount = activeTrips?.length ?? 0;
    if (!countErr && activeCount > 0 && !force) {
      const entityName = userRole === 'customer' ? 'Customer' : 'Driver';
      return NextResponse.json(
        {
          success: false,
          hasActiveBookings: true,
          activeCount,
          activeTrips: (activeTrips || []).map((t) => t.booking_reference),
          error: `${entityName} currently has ${activeCount} active in-progress booking(s). Please conclude or cancel these trips before permanently deleting.`,
        },
        { status: 400 }
      );
    }

    // 2. If user had an assigned vehicle (driver), release it back to available
    const { data: driverData } = await admin
      .from('drivers')
      .select('assigned_vehicle_id')
      .eq('id', uid)
      .maybeSingle();

    if (driverData?.assigned_vehicle_id) {
      await admin
        .from('vehicles')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', driverData.assigned_vehicle_id);
    }

    // 3. Safe deletion strategy: Preserve completed trip history, financial records, ratings, and audit logs!
    // Nullify assigned_driver_id and customer_id on bookings so historical booking records remain intact
    await admin
      .from('bookings')
      .update({ assigned_driver_id: null, updated_at: new Date().toISOString() })
      .eq('assigned_driver_id', uid);

    await admin
      .from('bookings')
      .update({ customer_id: null, updated_at: new Date().toISOString() })
      .eq('customer_id', uid);

    await admin
      .from('bookings')
      .update({ created_by: null })
      .eq('created_by', uid);

    await admin
      .from('bookings')
      .update({ cancelled_by: null })
      .eq('cancelled_by', uid);

    // Preserve financial records: nullify customer_id and collected_by on payments
    await admin
      .from('payments')
      .update({ customer_id: null })
      .eq('customer_id', uid);

    await admin
      .from('payments')
      .update({ collected_by: null })
      .eq('collected_by', uid);

    // Preserve rating history: nullify customer_id and driver_id on ratings_feedback
    await admin
      .from('ratings_feedback')
      .update({ customer_id: null })
      .eq('customer_id', uid);

    await admin
      .from('ratings_feedback')
      .update({ driver_id: null })
      .eq('driver_id', uid);

    // Preserve audit logs: nullify user_id
    await admin
      .from('audit_logs')
      .update({ user_id: null })
      .eq('user_id', uid);

    // Delete customer dependent tables (contacts, saved places, recents, customers row)
    await admin.from('emergency_contacts').delete().eq('customer_id', uid);
    await admin.from('saved_places').delete().eq('customer_id', uid);
    await admin.from('recent_locations').delete().eq('customer_id', uid);
    await admin.from('customers').delete().eq('id', uid);

    // Remove driver telemetry/locations & driver row
    await admin.from('driver_locations').delete().eq('driver_id', uid);
    await admin.from('drivers').delete().eq('id', uid);

    // 4. Cascade delete via RPC or auth.admin
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
    if (isUuid) {
      try {
        await admin.rpc('admin_delete_user', { target_user_id: uid });
      } catch (e: unknown) {
        console.warn('[DELETE /api/admin/users] RPC delete error:', e);
      }
      try {
        await admin.auth.admin.deleteUser(uid);
      } catch (e: unknown) {
        console.warn('[DELETE /api/admin/users] Auth delete error:', e);
      }
    }

    // 5. Delete public.profiles record
    await admin.from('profiles').delete().eq('id', uid);

    return NextResponse.json({
      success: true,
      message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} account deleted permanently while preserving trip and financial history.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error while deleting user';
    console.error('[DELETE /api/admin/users] Error:', err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
