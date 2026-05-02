import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  createBrowserLocalVerifierAuthority,
  detectDcApiSupport,
  requestCredentialWithAuthority,
  type CredentialGetter,
  type DcApiSupport,
  type RequestCredentialWithAuthorityResult,
  type VerifierAuthority,
  type VerifierCredentialCompletion,
  type VerifierPreparedCredentialRequest,
} from "./dcapi-verifier.ts";
import type { SmartCheckinRequest } from "./core.ts";

export type SmartCheckinVerifierPhase =
  | "idle"
  | "preparing"
  | "requesting"
  | "completing"
  | "complete"
  | "error";

export type SmartCheckinVerifierState = {
  phase: SmartCheckinVerifierPhase;
  preparedRequest?: VerifierPreparedCredentialRequest;
  credentialDebugJson?: unknown;
  completion?: VerifierCredentialCompletion;
  error?: Error;
};

export type UseSmartCheckinVerifierOptions = {
  authority?: VerifierAuthority;
  origin?: string;
  getCredential?: CredentialGetter;
  onPrepared?: (prepared: VerifierPreparedCredentialRequest) => void;
  onCredential?: (credential: unknown, prepared: VerifierPreparedCredentialRequest) => void;
  onComplete?: (
    completion: VerifierCredentialCompletion,
    prepared: VerifierPreparedCredentialRequest,
  ) => void;
  onError?: (error: Error, state: SmartCheckinVerifierState) => void;
};

export function useDcApiSupport(): DcApiSupport {
  const [support, setSupport] = useState<DcApiSupport>(() => detectDcApiSupport());
  useEffect(() => {
    setSupport(detectDcApiSupport());
  }, []);
  return support;
}

export function useSmartCheckinVerifier(
  options: UseSmartCheckinVerifierOptions = {},
): SmartCheckinVerifierState & {
  requestCredential: (request: SmartCheckinRequest) => Promise<RequestCredentialWithAuthorityResult>;
  reset: () => void;
} {
  const resolvedOrigin =
    options.origin ?? (typeof location === "undefined" ? undefined : location.origin);
  const authority = useMemo(() => {
    if (options.authority) return options.authority;
    if (!resolvedOrigin) return undefined;
    return createBrowserLocalVerifierAuthority({
      origin: resolvedOrigin,
      getCredential: options.getCredential,
    });
  }, [options.authority, options.getCredential, resolvedOrigin]);

  const [state, setState] = useState<SmartCheckinVerifierState>({ phase: "idle" });

  const reset = useCallback(() => {
    setState({ phase: "idle" });
  }, []);

  const requestCredential = useCallback(
    async (request: SmartCheckinRequest) => {
      if (!authority) {
        throw new Error("No verifier authority is available; pass authority or origin.");
      }

      setState({ phase: "preparing" });
      try {
        const result = await requestCredentialWithAuthority({
          authority,
          request,
          getCredential: options.getCredential,
          onPrepared: (prepared) => {
            setState({ phase: "requesting", preparedRequest: prepared });
            options.onPrepared?.(prepared);
          },
          onCredential: (credential, prepared) => {
            setState({
              phase: "completing",
              preparedRequest: prepared,
            });
            options.onCredential?.(credential, prepared);
          },
          onComplete: (completion, prepared) => {
            setState({
              phase: "complete",
              preparedRequest: prepared,
              credentialDebugJson: completion.credentialDebugJson,
              completion,
            });
            options.onComplete?.(completion, prepared);
          },
        });
        return result;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        const errorState: SmartCheckinVerifierState = { phase: "error", error };
        setState(errorState);
        options.onError?.(error, errorState);
        throw error;
      }
    },
    [authority, options],
  );

  return {
    ...state,
    requestCredential,
    reset,
  };
}

export type SmartCheckinButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onError"
> & {
  request: SmartCheckinRequest;
  verifier?: UseSmartCheckinVerifierOptions;
  children?: ReactNode | ((state: SmartCheckinVerifierState) => ReactNode);
  onComplete?: (
    completion: VerifierCredentialCompletion,
    prepared: VerifierPreparedCredentialRequest,
  ) => void;
  onError?: (error: Error, state: SmartCheckinVerifierState) => void;
};

export function SmartCheckinButton({
  request,
  verifier,
  children,
  onComplete,
  onError,
  disabled,
  onClick,
  ...buttonProps
}: SmartCheckinButtonProps) {
  const binding = useSmartCheckinVerifier({
    ...verifier,
    onComplete,
    onError,
  });
  const busy = ["preparing", "requesting", "completing"].includes(binding.phase);
  const label =
    typeof children === "function"
      ? children(binding)
      : children ?? defaultButtonLabel(binding.phase);

  return (
    <button
      {...buttonProps}
      disabled={disabled || busy}
      onClick={async (event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        await binding.requestCredential(request);
      }}
    >
      {label}
    </button>
  );
}

function defaultButtonLabel(phase: SmartCheckinVerifierPhase): string {
  switch (phase) {
    case "preparing":
      return "Preparing request...";
    case "requesting":
      return "Opening wallet...";
    case "completing":
      return "Validating response...";
    case "complete":
      return "Check-in information received";
    case "error":
      return "Try sharing again";
    case "idle":
      return "Share check-in information";
  }
}
