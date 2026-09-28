import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getMockState } from '@/lib/mock-store';
import { generateFirewallConfig, generateEthersConfig, computeConfigHash, UserConfigInput } from '@/lib/config-generator';

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = getMockState();
  return NextResponse.json({
    mac_auth: state.mockMacAuth,
    current_role: session.role,
  });
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { enabled, disabled_until } = body;
    const state = getMockState();

    if (enabled === true) {
      // Re-enable MAC authentication
      state.setMockMacAuth({
        enabled: true,
        disabled_until: null,
      });
    } else {
      // Turning OFF MAC authentication
      if (session.role === 'subadmin') {
        if (!disabled_until) {
          return NextResponse.json(
            { error: 'Subadmins cannot disable MAC authentication permanently. You must select an end date/duration.' },
            { status: 403 }
          );
        }

        const expiryDate = new Date(disabled_until);
        const maxExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days max
        if (isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
          return NextResponse.json(
            { error: 'Invalid expiration date. Please select a valid future date.' },
            { status: 400 }
          );
        }

        if (expiryDate.getTime() > maxExpiry.getTime() + 60000) {
          return NextResponse.json(
            { error: 'Subadmins cannot disable MAC authentication for more than 30 days.' },
            { status: 403 }
          );
        }

        state.setMockMacAuth({
          enabled: false,
          disabled_until: expiryDate.toISOString(),
          disabled_by_role: 'subadmin',
        });
      } else {
        // Admin can set permanently (null) or with a schedule
        state.setMockMacAuth({
          enabled: false,
          disabled_until: disabled_until ? new Date(disabled_until).toISOString() : null,
          disabled_by_role: 'admin',
        });
      }
    }

    // Automatically update firewall config and version
    const updatedUsers = state.mockUsers;
    const finalUsersForConfig: UserConfigInput[] = updatedUsers.map((u) => {
      const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
      return {
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
      };
    });

    const nextVer = state.mockVersion + 1;
    const currentState = getMockState();
    const firewall = generateFirewallConfig(finalUsersForConfig, currentState.mockMacAuth.enabled);
    const ethers = generateEthersConfig(updatedUsers);
    const hash = computeConfigHash(firewall, ethers);

    state.setMockVersion(nextVer);
    state.setMockLastApplied(new Date().toISOString());

    return NextResponse.json({
      success: true,
      mac_auth: currentState.mockMacAuth,
      version: nextVer,
      hash,
      message: currentState.mockMacAuth.enabled
        ? 'MAC Authentication turned ON (Access restricted to registered MACs)'
        : `MAC Authentication turned OFF (Open to all devices${currentState.mockMacAuth.disabled_until ? ` until ${new Date(currentState.mockMacAuth.disabled_until).toLocaleString()}` : ' permanently'})`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
